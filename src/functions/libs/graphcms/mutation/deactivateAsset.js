const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    mutation DeactiveAsset(
      $id: ID!,
    ) {
      updateAsset(
        data: {
          active: false
        }, 
        where: {
          id: $id
        }
      ) {
        id
      }
    }  
  `;
};
