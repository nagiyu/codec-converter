﻿using System;
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

                    SetInputVideoPathButtonEnabled(false);

                    SetCodecListComboBoxEnabled(false);

                    SetOutputVideoPathTextBoxEnabled(false);

                    SetConvertButtonEnabled(false);

                    SetResetButtonEnabled(false);
                }
                else
                {
                    ChangeStatus();
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

            comboBox_CodecList.SelectedIndex = 0;

            ChangeStatus();
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
        /// FFmpeg のパスを設定するリンクラベルの表示/非表示を設定する
        /// </summary>
        /// <param name="visible">表示/非表示</param>
        private void SetFFmpegPathLinkLabelVisible(bool visible)
        {
            if (linkLabel_SetFFmpegPath.InvokeRequired)
            {
                linkLabel_SetFFmpegPath.Invoke(new Action(() => linkLabel_SetFFmpegPath.Visible = visible));
            }
            else
            {
                linkLabel_SetFFmpegPath.Visible = visible;
            }
        }

        /// <summary>
        /// FFmpeg のパスを設定するラベルを更新する
        /// </summary>
        /// <param name="text">ラベルのテキスト</param>
        private void UpdateSetFFmpegPathLinkLabel(string text)
        {
            if (linkLabel_SetFFmpegPath.InvokeRequired)
            {
                linkLabel_SetFFmpegPath.Invoke(new Action(() => linkLabel_SetFFmpegPath.Text = text));
            }
            else
            {
                linkLabel_SetFFmpegPath.Text = text;
            }
        }

        /// <summary>
        /// 変換元の動画ファイルを設定するリンクラベルの表示/非表示を設定する
        /// </summary>
        /// <param name="visible">表示/非表示</param>
        private void SetInputVideoPathLinkLabelVisible(bool visible)
        {
            if (linkLabel_SetInputVideoPath.InvokeRequired)
            {
                linkLabel_SetInputVideoPath.Invoke(new Action(() => linkLabel_SetInputVideoPath.Visible = visible));
            }
            else
            {
                linkLabel_SetInputVideoPath.Visible = visible;
            }
        }

        /// <summary>
        /// 変換元の動画ファイルを設定するリンクラベルを更新する
        /// </summary>
        /// <param name="text">ラベルのテキスト</param>
        private void UpdateSetInputVideoPathLinkLabel(string text)
        {
            if (linkLabel_SetInputVideoPath.InvokeRequired)
            {
                linkLabel_SetInputVideoPath.Invoke(new Action(() => linkLabel_SetInputVideoPath.Text = text));
            }
            else
            {
                linkLabel_SetInputVideoPath.Text = text;
            }
        }

        /// <summary>
        /// 変換元の動画ファイルを設定するボタンの有効/無効を設定する
        /// </summary>
        /// <param name="enabled">有効/無効</param>
        private void SetInputVideoPathButtonEnabled(bool enabled)
        {
            if (button_SetInputVideoPath.InvokeRequired)
            {
                button_SetInputVideoPath.Invoke(new Action(() => button_SetInputVideoPath.Enabled = enabled));
            }
            else
            {
                button_SetInputVideoPath.Enabled = enabled;
            }
        }

        /// <summary>
        /// 変換元の動画ファイルを設定するボタンの表示/非表示を設定する
        /// </summary>
        /// <param name="visible">表示/非表示</param>
        private void SetInputVideoPathButtonVisible(bool visible)
        {
            if (button_SetInputVideoPath.InvokeRequired)
            {
                button_SetInputVideoPath.Invoke(new Action(() => button_SetInputVideoPath.Visible = visible));
            }
            else
            {
                button_SetInputVideoPath.Visible = visible;
            }
        }

        /// <summary>
        /// コーデック選択のコンボボックスの有効/無効を設定する
        /// </summary>
        /// <param name="enabled">有効/無効</param>
        private void SetCodecListComboBoxEnabled(bool enabled)
        {
            if (comboBox_CodecList.InvokeRequired)
            {
                comboBox_CodecList.Invoke(new Action(() => comboBox_CodecList.Enabled = enabled));
            }
            else
            {
                comboBox_CodecList.Enabled = enabled;
            }
        }

        /// <summary>
        /// 変換元の動画ファイルのコーデックを表示するラベルを更新する
        /// </summary>
        /// <param name="text">コーデック</param>
        private void UpdateInputVideoCodecLabel(string text)
        {
            var labelText = $"今のコーデック: {text}";

            if (label_InputVideoCodec.InvokeRequired)
            {
                label_InputVideoCodec.Invoke(new Action(() => label_InputVideoCodec.Text = labelText));
            }
            else
            {
                label_InputVideoCodec.Text = labelText;
            }
        }

        /// <summary>
        /// 変換先の動画ファイルを設定するテキストボックスの有効/無効を設定する
        /// </summary>
        /// <param name="enabled">有効/無効</param>
        private void SetOutputVideoPathTextBoxEnabled(bool enabled)
        {
            if (textBox_SetOutputVideoPath.InvokeRequired)
            {
                textBox_SetOutputVideoPath.Invoke(new Action(() => textBox_SetOutputVideoPath.Enabled = enabled));
            }
            else
            {
                textBox_SetOutputVideoPath.Enabled = enabled;
            }
        }

        /// <summary>
        /// 変換先の動画ファイルを設定するテキストボックスを更新する
        /// </summary>
        /// <param name="text">変換先の動画ファイル</param>
        private void UpdateSetOutputVideoPathTextBox(string text)
        {
            if (textBox_SetOutputVideoPath.InvokeRequired)
            {
                textBox_SetOutputVideoPath.Invoke(new Action(() => textBox_SetOutputVideoPath.Text = text));
            }
            else
            {
                textBox_SetOutputVideoPath.Text = text;
            }
        }

        /// <summary>
        /// 変換ボタンの有効/無効を設定する
        /// </summary>
        /// <param name="enabled">有効/無効</param>
        private void SetConvertButtonEnabled(bool enabled)
        {
            if (button_Convert.InvokeRequired)
            {
                button_Convert.Invoke(new Action(() => button_Convert.Enabled = enabled));
            }
            else
            {
                button_Convert.Enabled = enabled;
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
        /// 全体の状態を変更する
        /// </summary>
        private void ChangeStatus()
        {
            SetFFmpegPathButtonEnabled(true);

            if (!string.IsNullOrEmpty(ffmpegPath))
            {
                SetFFmpegPathButtonVisible(false);
                SetFFmpegPathLinkLabelVisible(true);
            }
            else
            {
                SetFFmpegPathButtonVisible(true);
                SetFFmpegPathLinkLabelVisible(false);
            }

            if (!string.IsNullOrEmpty(ffmpegPath))
            {
                SetInputVideoPathButtonEnabled(true);
            }
            else
            {
                SetInputVideoPathButtonEnabled(false);
            }

            if (!string.IsNullOrEmpty(inputVideoPath))
            {
                SetInputVideoPathButtonVisible(false);
                SetInputVideoPathLinkLabelVisible(true);
            }
            else
            {
                SetInputVideoPathButtonVisible(true);
                SetInputVideoPathLinkLabelVisible(false);
            }

            if (!string.IsNullOrEmpty(inputVideoPath))
            {
                SetCodecListComboBoxEnabled(true);
            }
            else
            {
                SetCodecListComboBoxEnabled(false);
            }

            if (!string.IsNullOrEmpty(inputVideoPath))
            {
                SetOutputVideoPathTextBoxEnabled(true);
            }
            else
            {
                SetOutputVideoPathTextBoxEnabled(false);
            }

            if (!string.IsNullOrEmpty(inputVideoPath) && !string.IsNullOrEmpty(ffmpegPath) && !string.IsNullOrEmpty(textBox_SetOutputVideoPath.Text))
            {
                SetConvertButtonEnabled(true);
            }
            else
            {
                SetConvertButtonEnabled(false);
            }

            SetResetButtonEnabled(true);
        }

        /// <summary>
        /// ローディングを伴う処理
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

        /// <summary>
        /// FFmpeg のパスを設定するボタンのクリックイベント
        /// </summary>
        /// <param name="sender">Sender</param>
        /// <param name="e">Args</param>
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

                    UpdateSetFFmpegPathLinkLabel(ffmpegPath);

                    SetFFmpegPathButtonVisible(false);
                    SetFFmpegPathLinkLabelVisible(true);
                });
            }
        }

        /// <summary>
        /// 変換元の動画ファイルを設定するボタンのクリックイベント
        /// </summary>
        /// <param name="sender">Sender</param>
        /// <param name="e">Args</param>
        private void ClickSetInputVideoPathButton(object sender, EventArgs e)
        {
            var openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Executable Files (*.mp4)|*.mp4";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                ActionWithLoading(() =>
                {
                    inputVideoPath = openFileDialog.FileName;

                    UpdateSetInputVideoPathLinkLabel(inputVideoPath);

                    SetInputVideoPathButtonVisible(false);
                    SetInputVideoPathLinkLabelVisible(true);

                    var codec = Converter.GetCodec(ffmpegPath, inputVideoPath);

                    UpdateInputVideoCodecLabel(codec);

                    var outputFileName = inputVideoPath.EndsWith(".mp4") ? inputVideoPath.Substring(0, inputVideoPath.Length - 4) : inputVideoPath;
                    UpdateSetOutputVideoPathTextBox($"{outputFileName}_{comboBox_CodecList.Text}.mp4");
                });
            }
        }

        /// <summary>
        /// 変換ボタンのクリックイベント
        /// </summary>
        /// <param name="sender">Sender</param>
        /// <param name="e">Args</param>
        private void Convert(object sender, EventArgs e)
        {
            ActionWithLoading(() =>
            {
                var codec = comboBox_CodecList.Text;
                var outputVideoPath = textBox_SetOutputVideoPath.Text;

                UpdateConvertStatusLabel("変換中...");

                var processId = Converter.ConvertWithCodec(ffmpegPath, inputVideoPath, outputVideoPath, codec);

                while (!ProcessUtil.IsExited(processId))
                {
                    Thread.Sleep(1000);
                }

                UpdateConvertStatusLabel(string.Empty);
            });
        }

        /// <summary>
        /// リセットボタンのクリックイベント
        /// </summary>
        /// <param name="sender">Sender</param>
        /// <param name="e">Args</param>
        private void Reset(object sender, EventArgs e)
        {
            ActionWithLoading(() =>
            {
                ffmpegPath = string.Empty;
                inputVideoPath = string.Empty;

                comboBox_CodecList.SelectedIndex = 0;

                UpdateSetFFmpegPathLinkLabel(string.Empty);
                UpdateSetInputVideoPathLinkLabel(string.Empty);
                UpdateInputVideoCodecLabel(string.Empty);
                UpdateSetOutputVideoPathTextBox(string.Empty);

                ChangeStatus();
            });
        }
    }
}
