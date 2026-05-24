using System;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace QuickMathDesktop
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Form mainForm = new Form
            {
                Text = "QuickMath // Quant Interview Prep",
                Width = 1040,
                Height = 679,
                StartPosition = FormStartPosition.CenterScreen,
                FormBorderStyle = FormBorderStyle.Sizable,
                MaximizeBox = true,
                MinimumSize = new System.Drawing.Size(1040, 679)
            };

            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
            if (File.Exists(iconPath))
            {
                try
                {
                    mainForm.Icon = new System.Drawing.Icon(iconPath);
                }
                catch { /* Safe fallback if icon format is invalid */ }
            }

            WebView2 webView = new WebView2
            {
                Dock = DockStyle.Fill
            };

            mainForm.Controls.Add(webView);

            mainForm.Load += async (sender, e) =>
            {
                try
                {
                    // Create a separate profile directory under the app folder to prevent permission issues
                    string userPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "QuickMath_Data");
                    var env = await CoreWebView2Environment.CreateAsync(null, userPath);
                    
                    await webView.EnsureCoreWebView2Async(env);

                    webView.CoreWebView2.WebMessageReceived += (s, args) =>
                    {
                        try
                        {
                            string message = args.TryGetWebMessageAsString();
                            if (message == "exit")
                            {
                                Application.Exit();
                            }
                        }
                        catch { }
                    };

                    // Disable standard context menus and developer tools to keep the clean app feeling
                    webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                    webView.CoreWebView2.Settings.AreDevToolsEnabled = false;

                    // Enable folder mapping to load the local index.html directly from the binary directory
                    string appDirectory = AppDomain.CurrentDomain.BaseDirectory;
                    webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "quickmath.local",
                        appDirectory,
                        CoreWebView2HostResourceAccessKind.Allow
                    );

                    webView.Source = new Uri("https://quickmath.local/index.html");
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Initialization Error: {ex.Message}", "QuickMath Launch Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };

            Application.Run(mainForm);
        }
    }
}
