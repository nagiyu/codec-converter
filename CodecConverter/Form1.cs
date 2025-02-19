using System;
using System.Threading;
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
            InitializeComponent();
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

            var processId = Converter.ConvertWithCodec(ffmpegPath, inputVideoPath, outputVideoPath, codec);

            UpdateLabel("変換中...");

            while (!ProcessUtil.IsExited(processId))
            {
                Thread.Sleep(1000);
            }

            UpdateLabel(string.Empty);
        }
    }
}
