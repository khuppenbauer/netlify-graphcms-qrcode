const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    mutation UpdateAsset(
      $id: ID!,
      $darkColor: Hex,
      $lightColor: Hex,
      $sha1: String,
    ) {
      updateAsset(
        where: { id: $id }
        data: {
          active: true
          darkColor: {
            hex: $darkColor
          }
          lightColor: {
            hex: $lightColor
          }
          sha1: $sha1
        }
      ) {
        id  
      }
    }  
  `;
};
