const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    mutation ConnectQrCode(
      $id: ID,
      $assetId: ID,
      $name: String,
      $qrCodeId: ID,
      $shortCode: String,
      $width: Int,
      $lightColor: Hex,
      $darkColor: Hex,
    ) {
      upsertPage(
        where: {
          id: $id
        }
        upsert: {
          update: {
            qrCode: {
              upsert: {
                where: {
                  id: $qrCodeId
                }, 
                data: {
                  create: {
                    image: {
                      connect: {
                        id: $assetId
                      }
                    }
                    shortCode: $shortCode
                    width: $width
                    lightColor: {
                      hex: $lightColor
                    }
                    darkColor: {
                      hex: $darkColor
                    }
                  },
                  update: {
                    image: {
                      connect: {
                        id: $assetId
                      }
                    }
                    shortCode: $shortCode
                    width: $width
                    lightColor: {
                      hex: $lightColor
                    }
                    darkColor: {
                      hex: $darkColor
                    }
                  }
                }
              }
            }
          },
          create: {
            name: $name
          }
        }
      ) {
        id
        stage
      }
    }
  `;
};
