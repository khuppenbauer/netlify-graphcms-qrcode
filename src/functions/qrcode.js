const dotenv = require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { GraphQLClient } = require('graphql-request');
const QRCode = require('qrcode');
const crypto = require('crypto');

const graphcmsMutation = require('./libs/graphcms/mutation');
const graphcmsQuery = require('./libs/graphcms/query');

const uploadUrl = process.env.HYGRAPH_API_URL;
const token = process.env.HYGRAPH_API_TOKEN;
const graphcms = new GraphQLClient(
  uploadUrl,
  {
    headers: {
      authorization: `Bearer ${token}`,
    },
  },
);

const rgb2hex = (rgba) => {
  const { r, g, b } = rgba;
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`
}

const getUser = async (id) => {
  const query = await graphcmsQuery.getUser();
  const queryVariables = {
    id,
  };
  const { user } = await graphcms.request(query, queryVariables);
  return user;
};

const getPage = async (id) => {
  const query = await graphcmsQuery.getPage();
  const queryVariables = {
    id,
  };
  const { page } = await graphcms.request(query, queryVariables);
  return page;
};

const isApiOperation = async (operation, data) => {
  const { createdBy, updatedBy, publishedBy } = data;
  let operationUser = null;
  switch (operation) {
    case 'create':
      operationUser = createdBy;
      break;
    case 'update':
      operationUser = updatedBy;
      break;
    case 'publish':
      operationUser = publishedBy
      break;   
  }
  const user = await getUser(operationUser.id);
  return user.kind !== 'MEMBER';
}

const createQrCode = async(fileName, url, width, lightColor, darkColor) => {
  const lightColorHex = rgb2hex(lightColor.rgba);
  const darkColorHex = rgb2hex(darkColor.rgba);
  QRCode.toFile(fileName, url, {
    width: width || 160,
    color: {
      dark: darkColorHex || '#000000',
      light: lightColorHex || '#ffffff'
    }
  }, function (err) {
    if (err) throw err
  })
}

const uploadAsset = async (fileName) => {
  const form = new FormData();
  form.append('fileUpload', fs.createReadStream(fileName));
  const res = await axios({
    method: 'post',
    url: `${uploadUrl}/upload`,
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
    data: form,
  });
  return res.data;
};

const updateAsset = async (id, lightColor, darkColor, sha1) => {
  const mutation = await graphcmsMutation.updateAsset();
  const mutationVariables = {
    id,
    lightColor: rgb2hex(lightColor.rgba),
    darkColor: rgb2hex(darkColor.rgba),
    sha1,
  };
  return graphcms.request(mutation, mutationVariables);
};

const publishAsset = async (asset) => {
  const mutation = await graphcmsMutation.publishAsset();
  const mutationVariables = {
    id: asset,
  };
  return graphcms.request(mutation, mutationVariables);
};

const deactivateAsset = async (asset) => {
  const mutation = await graphcmsMutation.deactivateAsset();
  const mutationVariables = {
    id: asset,
  };
  return graphcms.request(mutation, mutationVariables);
};

const updateQrCode = async (id, name, slug, assetId, width, shortCode, lightColor, darkColor, qrCodeId) => {
  const mutation = await graphcmsMutation.upsertPageConnectQrCode();
  const mutationVariables = {
    id,
    name,
    slug,
    qrCodeId,
    assetId,
    width,
    shortCode,
    lightColor: rgb2hex(lightColor.rgba),
    darkColor: rgb2hex(darkColor.rgba),
  };
  return graphcms.request(mutation, mutationVariables);
};

const publishPage = async (id) => {
  const mutation = await graphcmsMutation.publishPage();
  const mutationVariables = {
    id,
  };
  return graphcms.request(mutation, mutationVariables);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const domain = event.headers.domain || 'https://www.mapseven.de';
    const { operation, data } = body;
    const apiOperation = await isApiOperation(operation, data);
    if (apiOperation) {
      return {
        statusCode: 200,
        body: 'API Operation',
      };
    }
    const { id, name, slug, qrCode } = data;
    if (!qrCode) {
      return {
        statusCode: 200,
        body: 'QrCode Missing',
      };
    }
    const sha1 = crypto
      .createHash('sha1')
      .update(JSON.stringify(qrCode))
      .digest('hex');
    const page = await getPage(id);
    const { qrCode: existingQrCode } = page;
    if (existingQrCode) {
      const { image: existingImage } = existingQrCode;
      if (existingImage) {
        const { sha1: existingSha1, id: imageId } = existingImage;
        if (existingSha1 === sha1) {
          return {
            statusCode: 200,
            body: 'Duplicate'
          };
        }
        if (imageId) {
          await deactivateAsset(imageId);
        }
      }
    }
    const width = qrCode.width || 160;
    const shortCode = qrCode.shortCode || slug.replace('/', '-');
    const lightColor = qrCode.lightColor || { rgba: { r: 255, g: 255, b: 255 }};
    const darkColor = qrCode.darkColor || { rgba: { r: 0, g: 0, b: 0 }};
    const url = `${domain}/${slug}`;
    const fileName = `/tmp/${shortCode}-${width}.png`
    await createQrCode(fileName, url, width, lightColor, darkColor);
    const asset = await uploadAsset(fileName);
    const { id: assetId } = asset;
    await updateAsset(assetId, lightColor, darkColor, sha1);
    await publishAsset(assetId);
    await updateQrCode(id, name, slug, assetId, width, shortCode, lightColor, darkColor, qrCode.id);
    await publishPage(id);
    return {
      statusCode: 200,
      body: 'Ok',
    };
  }
  return {
    statusCode: 405,
    body: 'Method Not Allowed',
  };
};
