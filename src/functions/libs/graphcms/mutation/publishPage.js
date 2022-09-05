const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    mutation PublishPage(
      $id: ID,  
    ) {
      publishPage(
        where: { id: $id }
      ) {
        id
        stage
      }
    }  
  `;
};
