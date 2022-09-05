const DeactivateAsset = require('./deactivateAsset');
const PublishAsset = require('./publishAsset');
const PublishPage = require('./publishPage');
const UpdateAsset = require('./updateAsset');
const UpsertPageConnectQrCode = require('./upsertPageConnectQrCode');

module.exports = {
  deactivateAsset: DeactivateAsset,
  publishAsset: PublishAsset,
  publishPage: PublishPage,
  updateAsset: UpdateAsset,
  upsertPageConnectQrCode: UpsertPageConnectQrCode,
};
