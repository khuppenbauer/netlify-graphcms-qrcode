const { gql } = require('graphql-request');

export const getPage = async () =>
  gql`
    query getPage($id: ID!) {
      page(where: { id: $id }) {
        qrCode {
          image {
            id
            sha1
          }
        }
      }
    }
  `;

export const getUser = async () =>
  gql`
    query getUser($id: ID!) {
      user(where: { id: $id }) {
        id
        name
        kind
      }
    }
  `;
