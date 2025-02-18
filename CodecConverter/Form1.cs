using System;
using System.Windows.Forms;

namespace CodecConverter
{
    public partial class Form1 : Form
    {
        /// <summary>
        /// FFmpeg のパス
        /// </summary>
        private string ffmpegPath = string.Empty;

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
    }
}
