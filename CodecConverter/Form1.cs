﻿using System;
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
            Converter.ConvertWithCodec(ffmpegPath, inputVideoPath, outputVideoPath, codec);
        }
    }
}
