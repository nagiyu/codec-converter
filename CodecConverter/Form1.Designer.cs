using System.Drawing;
using System.Windows.Forms;

namespace CodecConverter
{
    partial class CodecConverterForm
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            button_SetFFmpegPath = new Button();
            button_SetInputVideoPath = new Button();
            label_InputVideoCodec = new Label();
            comboBox_CodecList = new ComboBox();
            textBox_SetOutputVideoPath = new TextBox();
            button_Convert = new Button();
            label_ConvertStatus = new Label();
            label_SetFFmpegPath = new Label();
            label_SetInputVideoPath = new Label();
            label_SelectCodec = new Label();
            label_SetOutputVideoPath = new Label();
            button_Reset = new Button();
            SuspendLayout();
            // 
            // button_SetFFmpegPath
            // 
            button_SetFFmpegPath.Location = new Point(93, 12);
            button_SetFFmpegPath.Name = "button_SetFFmpegPath";
            button_SetFFmpegPath.Size = new Size(75, 23);
            button_SetFFmpegPath.TabIndex = 0;
            button_SetFFmpegPath.Text = "ファイル選択";
            button_SetFFmpegPath.UseVisualStyleBackColor = true;
            button_SetFFmpegPath.Click += ClickSetFFmpegPathButton;
            // 
            // button_SetInputVideoPath
            // 
            button_SetInputVideoPath.Location = new Point(93, 41);
            button_SetInputVideoPath.Name = "button_SetInputVideoPath";
            button_SetInputVideoPath.Size = new Size(75, 23);
            button_SetInputVideoPath.TabIndex = 2;
            button_SetInputVideoPath.Text = "ファイル選択";
            button_SetInputVideoPath.UseVisualStyleBackColor = true;
            button_SetInputVideoPath.Click += ClickSetInputVideoPathButton;
            // 
            // label_InputVideoCodec
            // 
            label_InputVideoCodec.AutoSize = true;
            label_InputVideoCodec.Location = new Point(93, 67);
            label_InputVideoCodec.Name = "label_InputVideoCodec";
            label_InputVideoCodec.Size = new Size(74, 15);
            label_InputVideoCodec.TabIndex = 5;
            label_InputVideoCodec.Text = "今のコーデック:";
            // 
            // comboBox_CodecList
            // 
            comboBox_CodecList.FormattingEnabled = true;
            comboBox_CodecList.Items.AddRange(new object[] { "libx265" });
            comboBox_CodecList.Location = new Point(93, 85);
            comboBox_CodecList.Name = "comboBox_CodecList";
            comboBox_CodecList.Size = new Size(121, 23);
            comboBox_CodecList.TabIndex = 7;
            // 
            // textBox_SetOutputVideoPath
            // 
            textBox_SetOutputVideoPath.Location = new Point(93, 114);
            textBox_SetOutputVideoPath.Name = "textBox_SetOutputVideoPath";
            textBox_SetOutputVideoPath.Size = new Size(573, 23);
            textBox_SetOutputVideoPath.TabIndex = 8;
            // 
            // button_Convert
            // 
            button_Convert.Location = new Point(93, 143);
            button_Convert.Name = "button_Convert";
            button_Convert.Size = new Size(75, 23);
            button_Convert.TabIndex = 9;
            button_Convert.Text = "変換";
            button_Convert.UseVisualStyleBackColor = true;
            button_Convert.Click += Convert;
            // 
            // label_ConvertStatus
            // 
            label_ConvertStatus.AutoSize = true;
            label_ConvertStatus.Location = new Point(174, 147);
            label_ConvertStatus.Name = "label_ConvertStatus";
            label_ConvertStatus.Size = new Size(0, 15);
            label_ConvertStatus.TabIndex = 10;
            // 
            // label_SetFFmpegPath
            // 
            label_SetFFmpegPath.AutoSize = true;
            label_SetFFmpegPath.Location = new Point(12, 16);
            label_SetFFmpegPath.Name = "label_SetFFmpegPath";
            label_SetFFmpegPath.Size = new Size(75, 15);
            label_SetFFmpegPath.TabIndex = 11;
            label_SetFFmpegPath.Text = "FFmpeg 設定";
            // 
            // label_SetInputVideoPath
            // 
            label_SetInputVideoPath.AutoSize = true;
            label_SetInputVideoPath.Location = new Point(12, 45);
            label_SetInputVideoPath.Name = "label_SetInputVideoPath";
            label_SetInputVideoPath.Size = new Size(67, 15);
            label_SetInputVideoPath.TabIndex = 12;
            label_SetInputVideoPath.Text = "変換元設定";
            // 
            // label_SelectCodec
            // 
            label_SelectCodec.AutoSize = true;
            label_SelectCodec.Location = new Point(12, 88);
            label_SelectCodec.Name = "label_SelectCodec";
            label_SelectCodec.Size = new Size(73, 15);
            label_SelectCodec.TabIndex = 13;
            label_SelectCodec.Text = "コーデック選択";
            // 
            // label_SetOutputVideoPath
            // 
            label_SetOutputVideoPath.AutoSize = true;
            label_SetOutputVideoPath.Location = new Point(12, 117);
            label_SetOutputVideoPath.Name = "label_SetOutputVideoPath";
            label_SetOutputVideoPath.Size = new Size(67, 15);
            label_SetOutputVideoPath.TabIndex = 14;
            label_SetOutputVideoPath.Text = "変換先設定";
            // 
            // button_Reset
            // 
            button_Reset.Location = new Point(93, 172);
            button_Reset.Name = "button_Reset";
            button_Reset.Size = new Size(75, 23);
            button_Reset.TabIndex = 15;
            button_Reset.Text = "リセット";
            button_Reset.UseVisualStyleBackColor = true;
            button_Reset.Click += Reset;
            // 
            // CodecConverterForm
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(678, 450);
            Controls.Add(label_SetFFmpegPath);
            Controls.Add(button_SetFFmpegPath);
            Controls.Add(label_SetInputVideoPath);
            Controls.Add(button_SetInputVideoPath);
            Controls.Add(label_SelectCodec);
            Controls.Add(comboBox_CodecList);
            Controls.Add(label_InputVideoCodec);
            Controls.Add(label_SetOutputVideoPath);
            Controls.Add(textBox_SetOutputVideoPath);
            Controls.Add(button_Reset);
            Controls.Add(label_ConvertStatus);
            Controls.Add(button_Convert);
            Name = "CodecConverterForm";
            Text = "CodecConverter";
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        /// <summary>
        /// FFmpeg のパスを設定するラベル
        /// </summary>
        private Label label_SetFFmpegPath;

        /// <summary>
        /// FFmpeg のパスを設定するボタン
        /// </summary>
        private Button button_SetFFmpegPath;

        /// <summary>
        /// 変換元の動画ファイルを設定するラベル
        /// </summary>
        private Label label_SetInputVideoPath;

        /// <summary>
        /// 変換元の動画ファイルを設定するボタン
        /// </summary>
        private Button button_SetInputVideoPath;

        /// <summary>
        /// コーデック選択のラベル
        /// </summary>
        private Label label_SelectCodec;

        /// <summary>
        /// コーデック選択のコンボボックス
        /// </summary>
        private ComboBox comboBox_CodecList;

        /// <summary>
        /// 変換元の動画ファイルのコーデックを表示するラベル
        /// </summary>
        private Label label_InputVideoCodec;

        /// <summary>
        /// 変換先の動画ファイルを設定するラベル
        /// </summary>
        private Label label_SetOutputVideoPath;

        /// <summary>
        /// 変換先の動画ファイルを設定するテキストボックス
        /// </summary>
        private TextBox textBox_SetOutputVideoPath;

        /// <summary>
        /// 変換ボタン
        /// </summary>
        private Button button_Convert;

        /// <summary>
        /// 変換状態を表示するラベル
        /// </summary>
        private Label label_ConvertStatus;

        /// <summary>
        /// リセットボタン
        /// </summary>
        private Button button_Reset;
    }
}
