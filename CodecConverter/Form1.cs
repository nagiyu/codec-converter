using System;
using System.Threading;
using System.Windows.Forms;
using CodecConverter.Service;

namespace CodecConverter
{
    public partial class CodecConverterForm : Form
    {
        /// <summary>
        /// FFmpeg のパス
        /// </summary>
        private string ffmpegPath = string.Empty;

        /// <summary>
        /// 入力動画ファイルのパス
        /// </summary>
        private string inputVideoPath = string.Empty;

        /// <summary>
        /// ローディング状態
        /// </summary>
        private bool isLoading = false;

        /// <summary>
        /// ローディング状態
        /// </summary>
        private bool IsLoading
        {
            get => isLoading;
            set
            {
                isLoading = value;

                if (isLoading)
                {
                    SetFFmpegPathButtonEnabled(false);
                    SetResetButtonEnabled(false);
                }
                else
                {
                    SetFFmpegPathButtonEnabled(true);
                    SetResetButtonEnabled(true);
                }
            }
        }

        private void UpdateConvertStatusLabel(string text)
        {
            if (label_ConvertStatus.InvokeRequired)
            {
                label_ConvertStatus.Invoke(new Action(() => label_ConvertStatus.Text = text));
            }
            else
            {
                label_ConvertStatus.Text = text;
            }
        }

        /// <summary>
        /// コンストラクタ
        /// </summary>
        public CodecConverterForm()
        {
            InitializeComponent();
        }

        /// <summary>
        /// FFmpeg のパスを設定するボタンの有効/無効を設定する
        /// </summary>
        /// <param name="enabled">有効/無効</param>
        private void SetFFmpegPathButtonEnabled(bool enabled)
        {
            if (button_SetFFmpegPath.InvokeRequired)
            {
                button_SetFFmpegPath.Invoke(new Action(() => button_SetFFmpegPath.Enabled = enabled));
            }
            else
            {
                button_SetFFmpegPath.Enabled = enabled;
            }
        }

        /// <summary>
        /// FFmpeg のパスを設定するボタンの表示/非表示を設定する
        /// </summary>
        /// <param name="visible">表示/非表示</param>
        private void SetFFmpegPathButtonVisible(bool visible)
        {
            if (button_SetFFmpegPath.InvokeRequired)
            {
                button_SetFFmpegPath.Invoke(new Action(() => button_SetFFmpegPath.Visible = visible));
            }
            else
            {
                button_SetFFmpegPath.Visible = visible;
            }
        }

        /// <summary>
        /// リセットボタンの有効/無効を設定する
        /// </summary>
        /// <param name="enabled">有効/無効</param>
        private void SetResetButtonEnabled(bool enabled)
        {
            if (button_Reset.InvokeRequired)
            {
                button_Reset.Invoke(new Action(() => button_Reset.Enabled = enabled));
            }
            else
            {
                button_Reset.Enabled = enabled;
            }
        }

        /// <summary>
        /// ローディングパネルの表示を伴う処理
        /// </summary>
        private void ActionWithLoading(Action action)
        {
            if (IsLoading)
            {
                action();
                return;
            }

            IsLoading = true;

            action();

            IsLoading = false;
        }

        private void ClickSetFFmpegPathButton(object sender, EventArgs e)
        {
            var openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Executable Files (*.exe)|*.exe";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                ActionWithLoading(() =>
                {
                    if (!Converter.IsFFmpeg(openFileDialog.FileName))
                    {
                        return;
                    }
                    ffmpegPath = openFileDialog.FileName;
                    SetFFmpegPathButtonVisible(false);
                });
            }
        }

        private void ClickSetInputVideoPathButton(object sender, EventArgs e)
        {
            var openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Executable Files (*.mp4)|*.mp4";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                inputVideoPath = openFileDialog.FileName;
            }
        }

        private void Convert(object sender, EventArgs e)
        {
            ActionWithLoading(() =>
            {
                var codec = comboBox_CodecList.Text;
                var outputVideoPath = textBox_SetOutputVideoPath.Text;

                var processId = Converter.ConvertWithCodec(ffmpegPath, inputVideoPath, outputVideoPath, codec);

                UpdateConvertStatusLabel("変換中...");

                while (!ProcessUtil.IsExited(processId))
                {
                    Thread.Sleep(1000);
                }

                UpdateConvertStatusLabel(string.Empty);
            });
        }
    }
}
