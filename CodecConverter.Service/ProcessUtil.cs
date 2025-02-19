using System;
using System.Diagnostics;

namespace CodecConverter.Service
{
    /// <summary>
    /// Process を扱うユーティリティ
    /// </summary>
    public static class ProcessUtil
    {
        /// <summary>
        /// プロセスが終了しているかどうかを取得する
        /// </summary>
        /// <param name="processId">Process ID</param>
        /// <returns>終了しているかどうか</returns>
        public static bool IsExited(int processId)
        {
            try
            {
                var process = Process.GetProcessById(processId);

                return process.HasExited;
            }
            catch (ArgumentException)
            {
                return true;
            }
        }
    }
}
