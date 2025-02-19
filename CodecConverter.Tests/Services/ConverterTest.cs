using System;
using System.Diagnostics;
using CodecConverter.Service;

namespace CodecConverter.Tests.Services
{
    [TestClass]
    public class ConverterTest
    {
        private readonly string ffmpegPath = "C:\\Users\\vboxuser\\Downloads\\ffmpeg-2025-02-17-git-b92577405b-full_build\\ffmpeg-2025-02-17-git-b92577405b-full_build\\bin\\ffmpeg.exe";

        [TestMethod]
        public void GetCodec()
        {
            var videoPath = "Z:\\2024091323533800-4CE9651EE88A979D41F24CE8D6EA1C23.mp4";
            var codec = Converter.GetCodec(ffmpegPath, videoPath);

            Debug.WriteLine(codec);
        }

        [TestMethod]
        public void Convert()
        {
            var videoPath = "Z:\\2024091323533800-4CE9651EE88A979D41F24CE8D6EA1C23.mp4";
            var outputPath = $"Z:\\output_{DateTime.Now:yyyyMMddHHmmss}.mp4";
            var codec = "libx265";
            var processId = Converter.ConvertWithCodec(ffmpegPath, videoPath, outputPath, codec);

            Debug.WriteLine(processId);
        }
    }
}
