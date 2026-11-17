using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Crônicas de Aether")]
[assembly: AssemblyDescription("Aplicativo de acesso ao RPG online Crônicas de Aether")]
[assembly: AssemblyProduct("Crônicas de Aether")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

internal static class Program
{
    private const string GameUrl = "https://cronicas-de-aether-rpg.vigilantpearl8.chatgpt.site";

    [STAThread]
    private static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        string edge = FindEdge();
        // Diagnostic mode checks dependencies without opening a browser or visiting the site.
        if (args.Length == 1 && args[0] == "--check") return edge == null ? 2 : 0;
        if (args.Length != 0) return 3;
        try
        {
            if (edge != null)
            {
                // Reuse the normal Edge profile so sign-in works in the standard browser too.
                // No remote debugging, disabled sandbox, custom certificate policy or bundled secrets.
                Process.Start(new ProcessStartInfo
                {
                    FileName = edge,
                    Arguments = "--app=" + GameUrl,
                    UseShellExecute = true
                });
            }
            else
            {
                MessageBox.Show(
                    "O Microsoft Edge não foi encontrado. O jogo será aberto no seu navegador padrão.\n\nÉ necessário estar conectado à internet e entrar na conta que tem acesso ao site.",
                    "Crônicas de Aether", MessageBoxButtons.OK, MessageBoxIcon.Information);
                OpenBrowser();
            }
            return 0;
        }
        catch (Exception)
        {
            DialogResult answer = MessageBox.Show(
                "Não foi possível abrir a janela do jogo. Deseja tentar no navegador padrão?\n\n" + GameUrl,
                "Crônicas de Aether", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (answer == DialogResult.Yes)
            {
                try { OpenBrowser(); return 0; }
                catch (Exception) { MessageBox.Show("Abra este endereço no navegador:\n\n" + GameUrl, "Crônicas de Aether"); }
            }
            return 1;
        }
    }

    private static void OpenBrowser()
    {
        Process.Start(new ProcessStartInfo(GameUrl) { UseShellExecute = true });
    }

    private static string FindEdge()
    {
        string[] folders = {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
        };
        foreach (string folder in folders)
        {
            if (String.IsNullOrEmpty(folder)) continue;
            string candidate = Path.Combine(folder, "Microsoft", "Edge", "Application", "msedge.exe");
            if (File.Exists(candidate)) return candidate;
        }
        foreach (RegistryKey root in new[] { Registry.CurrentUser, Registry.LocalMachine })
        {
            try
            {
                using (RegistryKey key = root.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
                {
                    string candidate = key == null ? null : key.GetValue(null) as string;
                    if (!String.IsNullOrEmpty(candidate) && File.Exists(candidate)) return candidate;
                }
            }
            catch (System.Security.SecurityException) { }
            catch (UnauthorizedAccessException) { }
        }
        return null;
    }
}
