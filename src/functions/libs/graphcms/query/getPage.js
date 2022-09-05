const { gql } = require('graphql-request');

module.exports = async () => {
  return gql`
    query getPage($id: ID!) {
      page(where: { id: $id }) {
        qrCode {
          image {
            id
          }
        }
      }
    }
  `;
};
