const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    mutation UpdateAsset(
      $id: ID!,
      $lightColor: Hex,
      $darkColor: Hex,
    ) {
      updateAsset(
        where: { id: $id }
        data: {
          active: true
          lightColor: {
            hex: $lightColor
          }
          darkColor: {
            hex: $darkColor
          }
        }
      ) {
        id  
      }
    }  
  `;
};
