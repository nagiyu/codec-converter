using System;
using System.Windows.Forms;
using CodecConverter.Service;

namespace CodecConverter
{
    public partial class Form1 : Form
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
        /// Process ID
        /// </summary>
        private int? processId = null;

        /// <summary>
        /// タイマー
        /// </summary>
        private System.Timers.Timer timer;

        /// <summary>
        /// Process ID
        /// </summary>
        public int? ProcessId
        {
            get => processId;
            set
            {
                processId = value;

                if (processId.HasValue)
                {
                    UpdateLabel(processId.ToString());
                }
                else
                {
                    UpdateLabel(string.Empty);
                }
            }
        }

        private void UpdateLabel(string text)
        {
            if (label4.InvokeRequired)
            {
                label4.Invoke(new Action(() => label4.Text = text));
            }
            else
            {
                label4.Text = text;
            }
        }

        public Form1()
        {
            timer = new System.Timers.Timer(1000);
            timer.Elapsed += (sender, e) =>
            {
                if (ProcessId.HasValue)
                {
                    if (ProcessUtil.IsExited(ProcessId.Value))
                    {
                        ProcessId = null;
                    }
                }
            };
            timer.AutoReset = true;
            timer.Enabled = true;

            InitializeComponent();
        }

        ~Form1()
        {
            timer.Dispose();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            var openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Executable Files (*.exe)|*.exe";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                ffmpegPath = openFileDialog.FileName;
                label1.Text = ffmpegPath;
            }
        }

        private void button2_Click(object sender, EventArgs e)
        {
            var openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Executable Files (*.mp4)|*.mp4";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                inputVideoPath = openFileDialog.FileName;
                label2.Text = inputVideoPath;
            }
        }

        private void button3_Click(object sender, EventArgs e)
        {
            var codec = Converter.GetCodec(ffmpegPath, inputVideoPath);
            label3.Text = codec;
        }

        private void button4_Click(object sender, EventArgs e)
        {
            var codec = comboBox1.Text;
            var outputVideoPath = textBox1.Text;
            ProcessId = Converter.ConvertWithCodec(ffmpegPath, inputVideoPath, outputVideoPath, codec);
        }
    }
}
