/**
 * DynamoDB module exports.
 */

export { getDocClient, getTableName } from "./client";
export {
  saveVideoFile,
  getVideoFileById,
  getVideoFileByS3Key,
} from "./videoFileRepository";
export { saveConversionJob, getConversionJobById } from "./conversionJobRepository";
