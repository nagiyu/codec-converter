/**
 * DynamoDB client configuration and initialization.
 * Uses the AWS SDK v3 DynamoDB document client for simplified operations.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Get the DynamoDB table name from environment variables.
 * Defaults to 'Entities-dev' for development.
 */
export function getTableName(): string {
  return process.env.DYNAMODB_TABLE_NAME || "Entities-dev";
}

/**
 * Create and configure the DynamoDB client.
 * Uses environment variables for configuration.
 */
function createDynamoDBClient(): DynamoDBClient {
  const config: ConstructorParameters<typeof DynamoDBClient>[0] = {
    region: process.env.AWS_REGION || "ap-northeast-1",
  };

  // Support local development with DynamoDB Local
  if (process.env.DYNAMODB_ENDPOINT) {
    config.endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  return new DynamoDBClient(config);
}

/**
 * Singleton DynamoDB document client instance.
 * Uses marshalling options optimized for our data model.
 */
let docClient: DynamoDBDocumentClient | null = null;

/**
 * Get the DynamoDB document client singleton.
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = createDynamoDBClient();
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        // Remove undefined values from items
        removeUndefinedValues: true,
        // Convert empty strings to null (DynamoDB doesn't support empty strings)
        convertEmptyValues: true,
      },
      unmarshallOptions: {
        // Don't wrap numbers in NumberValue objects
        wrapNumbers: false,
      },
    });
  }
  return docClient;
}
