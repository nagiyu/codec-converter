/**
 * Repository for VideoFile entity operations with DynamoDB.
 */

import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient, getTableName } from "./client";
import type { VideoFile } from "../models/videoFile";

/** DataType key for VideoFile entities in single-table design */
const DATA_TYPE = "VideoFile";

/**
 * Save a VideoFile entity to DynamoDB.
 * @param videoFile - The VideoFile entity to save
 */
export async function saveVideoFile(videoFile: VideoFile): Promise<void> {
  const docClient = getDocClient();
  const tableName = getTableName();

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        DataType: DATA_TYPE,
        id: videoFile.id,
        filename: videoFile.filename,
        s3_key: videoFile.s3_key,
        container: videoFile.container,
        video_codec: videoFile.video_codec,
        audio_codec: videoFile.audio_codec,
        duration_seconds: videoFile.duration_seconds,
        resolution: videoFile.resolution,
        file_size_bytes: videoFile.file_size_bytes,
        upload_timestamp: videoFile.upload_timestamp,
        owner_id: videoFile.owner_id,
        status: videoFile.status,
      },
    })
  );
}

/**
 * Get a VideoFile entity by its ID.
 * @param id - The VideoFile ID
 * @returns The VideoFile entity or null if not found
 */
export async function getVideoFileById(id: string): Promise<VideoFile | null> {
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
    filename: response.Item.filename,
    s3_key: response.Item.s3_key,
    container: response.Item.container,
    video_codec: response.Item.video_codec,
    audio_codec: response.Item.audio_codec,
    duration_seconds: response.Item.duration_seconds,
    resolution: response.Item.resolution,
    file_size_bytes: response.Item.file_size_bytes,
    upload_timestamp: response.Item.upload_timestamp,
    owner_id: response.Item.owner_id,
    status: response.Item.status,
  } as VideoFile;
}

/**
 * Get a VideoFile entity by its S3 key.
 * Note: This queries with DataType partition key and filters on s3_key.
 * For production, consider adding a GSI on s3_key if this becomes a common access pattern.
 * @param s3Key - The S3 key of the video file
 * @returns The VideoFile entity or null if not found
 */
export async function getVideoFileByS3Key(
  s3Key: string
): Promise<VideoFile | null> {
  const docClient = getDocClient();
  const tableName = getTableName();

  // Use Query with DataType partition key and filter on s3_key
  // This is more efficient than a full table scan but still requires filtering
  const response = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "DataType = :dt",
      FilterExpression: "s3_key = :sk",
      ExpressionAttributeValues: {
        ":dt": DATA_TYPE,
        ":sk": s3Key,
      },
      Limit: 1,
    })
  );

  if (!response.Items || response.Items.length === 0) {
    return null;
  }

  const item = response.Items[0];
  return {
    id: item.id,
    filename: item.filename,
    s3_key: item.s3_key,
    container: item.container,
    video_codec: item.video_codec,
    audio_codec: item.audio_codec,
    duration_seconds: item.duration_seconds,
    resolution: item.resolution,
    file_size_bytes: item.file_size_bytes,
    upload_timestamp: item.upload_timestamp,
    owner_id: item.owner_id,
    status: item.status,
  } as VideoFile;
}
