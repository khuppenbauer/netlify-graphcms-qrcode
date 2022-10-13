const dotenv = require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { GraphQLClient } = require('graphql-request');
const QRCode = require('qrcode');
const crypto = require('crypto');

const {
  updateAsset,
  publishAsset,
  deactivateAsset,
  deleteAsset,
  connectQrCode,
  publishPage,
} = require('./libs/hygraph/mutation');
const { getPage, getUser } = require('./libs/hygraph/query');

const qrCodeHost = process.env.QRCODE_HOST;
const uploadUrl = process.env.HYGRAPH_API_URL;
const token = process.env.HYGRAPH_API_TOKEN;
const hygraph = new GraphQLClient(uploadUrl, {
  headers: {
    authorization: `Bearer ${token}`,
  },
});

const rgb2hex = (rgba) => {
  const { r, g, b } = rgba;
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`;
};

const getHygraphUser = async (id) => {
  const query = await getUser();
  const queryVariables = {
    id,
  };
  const { user } = await hygraph.request(query, queryVariables);
  return user;
};

const getHygraphPage = async (id) => {
  const query = await getPage();
  const queryVariables = {
    id,
  };
  const { page } = await hygraph.request(query, queryVariables);
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
      operationUser = publishedBy;
      break;
  }
  const user = await getHygraphUser(operationUser.id);
  return user.kind !== 'MEMBER';
};

const createQrCode = async (
  fileName,
  url,
  width,
  lightColor,
  darkColor
) => {
  const lightColorHex = rgb2hex(lightColor.rgba);
  const darkColorHex = rgb2hex(darkColor.rgba);
  QRCode.toFile(fileName, url, {
    width: width || 160,
    color: {
      dark: darkColorHex || '#000000',
      light: lightColorHex || '#ffffff',
    },
  });
};

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

const updateHygraphAsset = async (
  id,
  lightColor,
  darkColor,
  sha1
) => {
  const mutation = await updateAsset();
  const mutationVariables = {
    id,
    lightColor: rgb2hex(lightColor.rgba),
    darkColor: rgb2hex(darkColor.rgba),
    sha1,
  };
  return hygraph.request(mutation, mutationVariables);
};

const publishHygraphAsset = async (asset) => {
  const mutation = await publishAsset();
  const mutationVariables = {
    id: asset,
  };
  return hygraph.request(mutation, mutationVariables);
};

const deleteHygraphAsset = async (asset) => {
  const mutation = await deleteAsset();
  const mutationVariables = {
    id: asset,
  };
  return hygraph.request(mutation, mutationVariables);
};

const deactivateHygraphAsset = async (asset) => {
  const mutation = await deactivateAsset();
  const mutationVariables = {
    id: asset,
  };
  return hygraph.request(mutation, mutationVariables);
};

const connectHygraphQrCode = async (
  id,
  title,
  slug,
  assetId,
  width,
  shortCode,
  lightColor,
  darkColor,
  qrCodeId
) => {
  const mutation = await connectQrCode();
  const mutationVariables = {
    id,
    title,
    slug,
    qrCodeId,
    assetId,
    width,
    shortCode,
    lightColor: rgb2hex(lightColor.rgba),
    darkColor: rgb2hex(darkColor.rgba),
  };
  return hygraph.request(mutation, mutationVariables);
};

const publishHygraphPage = async (id) => {
  const mutation = await publishPage();
  const mutationVariables = {
    id,
  };
  return hygraph.request(mutation, mutationVariables);
};

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const host = qrCodeHost;
    const { operation, data } = body;
    const apiOperation = await isApiOperation(operation, data);
    if (apiOperation) {
      return {
        statusCode: 200,
        body: 'Ok',
      };
    }
    const { id, title, slug, qrCode } = data;
    if (!qrCode) {
      return {
        statusCode: 200,
        body: 'Ok',
      };
    }
    const sha1 = crypto.createHash('sha1').update(JSON.stringify(qrCode)).digest('hex');
    const page = await getHygraphPage(id);
    const { qrCode: existingQrCode } = page;
    if (existingQrCode) {
      const { image: existingImage } = existingQrCode;
      if (existingImage) {
        const { sha1: existingSha1, id: imageId } = existingImage;
        if (existingSha1 === sha1) {
          return {
            statusCode: 200,
            body: 'Ok',
          };
        }
        if (imageId) {
          await deactivateHygraphAsset(imageId);
        }
      }
    }
    const width = qrCode.width || 160;
    const shortCode = qrCode.shortCode || slug.replace('/', '-');
    const lightColor = qrCode.lightColor || { rgba: { r: 255, g: 255, b: 255 } };
    const darkColor = qrCode.darkColor || { rgba: { r: 0, g: 0, b: 0 } };
    const url = `https://${host}/${slug}`;
    const fileName = `/tmp/${shortCode}-${width}.png`;
    await createQrCode(fileName, url, width, lightColor, darkColor);
    let asset = await uploadAsset(fileName);
    console.log(asset);
    if (asset.width === 0) {
      await deleteHygraphAsset(asset.id);
      asset = await uploadAsset(fileName);
    }
    const { id: assetId } = asset;
    await updateHygraphAsset(assetId, lightColor, darkColor, sha1);
    await publishHygraphAsset(assetId);
    await connectHygraphQrCode(
      id,
      title,
      slug,
      assetId,
      width,
      shortCode,
      lightColor,
      darkColor,
      qrCode.id
    );
    await publishHygraphPage(id);
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
