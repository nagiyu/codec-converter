/**
 * Repository for ConversionJob entity operations with DynamoDB.
 */

import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient, getTableName } from "./client";
import type { ConversionJob } from "../models/conversionJob";

/** DataType key for ConversionJob entities in single-table design */
const DATA_TYPE = "ConversionJob";

/**
 * Save a ConversionJob entity to DynamoDB.
 * @param job - The ConversionJob entity to save
 */
export async function saveConversionJob(job: ConversionJob): Promise<void> {
  const docClient = getDocClient();
  const tableName = getTableName();

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        DataType: DATA_TYPE,
        id: job.id,
        video_file_id: job.video_file_id,
        target_codec: job.target_codec,
        container_hint: job.container_hint,
        status: job.status,
        progress_percent: job.progress_percent,
        submitted_at: job.submitted_at,
        started_at: job.started_at,
        finished_at: job.finished_at,
        output_s3_key: job.output_s3_key,
        error_message: job.error_message,
      },
    })
  );
}

/**
 * Get a ConversionJob entity by its ID.
 * @param id - The ConversionJob ID
 * @returns The ConversionJob entity or null if not found
 */
export async function getConversionJobById(
  id: string
): Promise<ConversionJob | null> {
  const docClient = getDocClient();
  const tableName = getTableName();

  const response = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        DataType: DATA_TYPE,
        id: id,
      },
    })
  );

  if (!response.Item) {
    return null;
  }

  return {
    id: response.Item.id,
    video_file_id: response.Item.video_file_id,
    target_codec: response.Item.target_codec,
    container_hint: response.Item.container_hint,
    status: response.Item.status,
    progress_percent: response.Item.progress_percent,
    submitted_at: response.Item.submitted_at,
    started_at: response.Item.started_at,
    finished_at: response.Item.finished_at,
    output_s3_key: response.Item.output_s3_key,
    error_message: response.Item.error_message,
  } as ConversionJob;
}
