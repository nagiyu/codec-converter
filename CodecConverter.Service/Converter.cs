using System;
using System.Diagnostics;

namespace CodecConverter.Service
{
    /// <summary>
    /// コンバーター
    /// </summary>
    public static class Converter
    {
        /// <summary>
        /// コーデックを取得する
        /// </summary>
        /// <param name="ffmpegPath">FFmpeg のパス</param>
        /// <param name="videoPath">動画ファイルのパス</param>
        /// <returns>コーデック</returns>
        public static string GetCodec(string ffmpegPath, string videoPath)
        {
            var arguments = $"-i \"{videoPath}\"";

            var startInfo = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process
            {
                StartInfo = startInfo
            };

            process.Start();

            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            var lines = error.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

            foreach (var line in lines)
            {
                if (line.Contains("Video:"))
                {
                    return line.Trim();
                }
            }

            return "コーデックが見つかりませんでした。";
        }

        /// <summary>
        /// コーデックを指定して変換する
        /// </summary>
        /// <param name="ffmpegPath">FFmpeg のパス</param>
        /// <param name="videoPath">変換元のパス</param>
        /// <param name="outputPath">変換先のパス</param>
        /// <param name="codec">コーデック</param>
        public static void ConvertWithCodec(string ffmpegPath, string videoPath, string outputPath, string codec)
        {
            var arguments = $"-i \"{videoPath}\" -c:v {codec} -c:a copy -n \"{outputPath}\"";

            var startInfo = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process
            {
                StartInfo = startInfo
            };

            process.Start();

            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();

            process.WaitForExit();

            if (!string.IsNullOrEmpty(error))
            {
                throw new Exception(error);
            }
        }
    }
}
