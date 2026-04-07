namespace NorthStarShelter.API.Helpers;

public static class DotEnvLoader
{
    public static void LoadIfPresent(params string[] paths)
    {
        foreach (var path in paths.Where(File.Exists).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            foreach (var rawLine in File.ReadAllLines(path))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                    continue;

                var separatorIndex = line.IndexOf('=');
                if (separatorIndex <= 0)
                    continue;

                var key = line[..separatorIndex].Trim();
                if (string.IsNullOrWhiteSpace(key) || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
                    continue;

                var value = line[(separatorIndex + 1)..].Trim();
                if (value.Length >= 2 && value.StartsWith('"') && value.EndsWith('"'))
                    value = value[1..^1];

                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
