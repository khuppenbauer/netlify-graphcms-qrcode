const { gql } = require('graphql-request');

export const updateAsset = async () =>
  gql`
    mutation UpdateAsset($id: ID!, $darkColor: Hex, $lightColor: Hex, $sha1: String) {
      updateAsset(
        where: { id: $id }
        data: {
          active: true
          darkColor: { hex: $darkColor }
          lightColor: { hex: $lightColor }
          sha1: $sha1
        }
      ) {
        id
      }
    }
  `;

export const publishAsset = async () =>
  gql`
    mutation PublishAsset($id: ID!) {
      publishAsset(where: { id: $id }) {
        id
        stage
      }
    }
  `;

export const deactivateAsset = async () =>
  gql`
    mutation DeactiveAsset($id: ID!) {
      updateAsset(data: { active: false }, where: { id: $id }) {
        id
      }
    }
  `;

export const deleteAsset = async () =>
  gql`
    mutation DeleteAsset($id: ID!) {
      deleteAsset(where: { id: $id }) {
        id
      }
    }
  `;

export const connectQrCode = async () =>
  gql`
    mutation ConnectQrCode(
      $id: ID
      $assetId: ID
      $title: String
      $qrCodeId: ID
      $shortCode: String
      $width: Int
      $lightColor: Hex
      $darkColor: Hex
    ) {
      upsertPage(
        where: { id: $id }
        upsert: {
          update: {
            qrCode: {
              upsert: {
                where: { id: $qrCodeId }
                data: {
                  create: {
                    image: { connect: { id: $assetId } }
                    shortCode: $shortCode
                    width: $width
                    lightColor: { hex: $lightColor }
                    darkColor: { hex: $darkColor }
                  }
                  update: {
                    image: { connect: { id: $assetId } }
                    shortCode: $shortCode
                    width: $width
                    lightColor: { hex: $lightColor }
                    darkColor: { hex: $darkColor }
                  }
                }
              }
            }
          }
          create: { title: $title }
        }
      ) {
        id
        stage
      }
    }
  `;

export const publishPage = async () =>
  gql`
    mutation PublishPage($id: ID) {
      publishPage(where: { id: $id }) {
        id
        stage
      }
    }
  `;

export const connectFormSubmission = async () =>
  gql`
    mutation ConnectFormSubmission(
      $name: String
      $email: String
      $formName: String
      $formData: Json
      $formSubmissionDate: DateTime
      $slug: String
      $sha1: String
    ) {
      upsertAttendee(
        where: { email: $email }
        upsert: {
          create: {
            formSubmissions: {
              create: {
                formData: $formData
                formName: $formName
                formSubmissionDate: $formSubmissionDate
                sha1: $sha1
                pages: { connect: { slug: $slug } }
              }
            }
            email: $email
            name: $name
          }
          update: {
            email: $email
            name: $name
            formSubmissions: {
              upsert: {
                where: { sha1: $sha1 }
                data: {
                  create: {
                    formData: $formData
                    formName: $formName
                    formSubmissionDate: $formSubmissionDate
                    sha1: $sha1
                    pages: { connect: { slug: $slug } }
                  }
                  update: {
                    formData: $formData
                    formName: $formName
                    formSubmissionDate: $formSubmissionDate
                    sha1: $sha1
                  }
                }
              }
            }
          }
        }
      ) {
        id
      }
    }
  `;
