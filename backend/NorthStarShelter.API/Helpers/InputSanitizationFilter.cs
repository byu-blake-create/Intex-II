using System.Collections;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Filters;

namespace NorthStarShelter.API.Helpers;

/// <summary>
/// Sanitizes incoming string fields on request models before controller actions run.
/// This provides a baseline against common HTML/script injection attempts.
/// </summary>
public sealed partial class InputSanitizationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var key in context.ActionArguments.Keys.ToList())
        {
            var arg = context.ActionArguments[key];
            if (arg is null)
                continue;

            if (arg is string str)
            {
                context.ActionArguments[key] = SanitizeString(str, key);
                continue;
            }

            SanitizeObjectGraph(arg, new HashSet<object>(ReferenceEqualityComparer.Instance), parentName: key);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // No-op
    }

    private static void SanitizeObjectGraph(object value, HashSet<object> visited, string parentName)
    {
        if (visited.Contains(value))
            return;

        var type = value.GetType();
        if (type.IsPrimitive || type.IsEnum || type == typeof(decimal) || type == typeof(DateTime) || type == typeof(DateOnly) || type == typeof(TimeOnly) || type == typeof(Guid))
            return;

        visited.Add(value);

        if (value is IDictionary dictionary)
        {
            foreach (DictionaryEntry entry in dictionary)
            {
                if (entry.Value is null)
                    continue;

                if (entry.Value is string dictString && entry.Key is string keyName)
                {
                    dictionary[entry.Key] = SanitizeString(dictString, keyName);
                    continue;
                }

                SanitizeObjectGraph(entry.Value, visited, parentName);
            }

            return;
        }

        if (value is IEnumerable enumerable && value is not string)
        {
            foreach (var item in enumerable)
            {
                if (item is null)
                    continue;

                if (item is string itemString)
                {
                    // Enumerable strings can only be sanitized when they are mutable collections.
                    // Most request models use object properties, which are handled below.
                    _ = SanitizeString(itemString, parentName);
                    continue;
                }

                SanitizeObjectGraph(item, visited, parentName);
            }
        }

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!prop.CanRead || !prop.CanWrite || prop.GetIndexParameters().Length > 0)
                continue;

            var propValue = prop.GetValue(value);
            if (propValue is null)
                continue;

            if (prop.PropertyType == typeof(string))
            {
                var current = (string)propValue;
                var cleaned = SanitizeString(current, prop.Name);
                if (!string.Equals(current, cleaned, StringComparison.Ordinal))
                {
                    prop.SetValue(value, cleaned);
                }

                continue;
            }

            SanitizeObjectGraph(propValue, visited, prop.Name);
        }
    }

    private static string SanitizeString(string input, string fieldName)
    {
        if (string.IsNullOrEmpty(input) || ShouldSkipField(fieldName))
            return input;

        if (IsHumanNameField(fieldName))
        {
            return SanitizeHumanName(input);
        }

        var sanitized = input
            .Replace("\0", string.Empty, StringComparison.Ordinal)
            .Replace("<", string.Empty, StringComparison.Ordinal)
            .Replace(">", string.Empty, StringComparison.Ordinal);

        sanitized = UnsafeControlCharsRegex().Replace(sanitized, string.Empty);
        sanitized = JavascriptProtocolRegex().Replace(sanitized, string.Empty);
        return sanitized;
    }

    private static bool ShouldSkipField(string fieldName)
    {
        if (string.IsNullOrWhiteSpace(fieldName))
            return false;

        return fieldName.Contains("password", StringComparison.OrdinalIgnoreCase)
            || fieldName.Contains("passcode", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsHumanNameField(string fieldName)
    {
        if (string.IsNullOrWhiteSpace(fieldName))
            return false;

        return fieldName.Contains("firstname", StringComparison.OrdinalIgnoreCase)
            || fieldName.Contains("lastname", StringComparison.OrdinalIgnoreCase)
            || fieldName.Equals("name", StringComparison.OrdinalIgnoreCase);
    }

    private static string SanitizeHumanName(string input)
    {
        var sanitized = input.Replace("\0", string.Empty, StringComparison.Ordinal);
        sanitized = HtmlTagRegex().Replace(sanitized, string.Empty);
        sanitized = NameAllowedCharsRegex().Replace(sanitized, string.Empty);
        sanitized = MultiWhitespaceRegex().Replace(sanitized, " ").Trim();
        return sanitized;
    }

    [GeneratedRegex(@"[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]", RegexOptions.Compiled)]
    private static partial Regex UnsafeControlCharsRegex();

    [GeneratedRegex(@"javascript\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex JavascriptProtocolRegex();

    [GeneratedRegex(@"<[^>]*>", RegexOptions.Compiled)]
    private static partial Regex HtmlTagRegex();

    [GeneratedRegex(@"[^\p{L}\p{M}\s'\-]", RegexOptions.Compiled)]
    private static partial Regex NameAllowedCharsRegex();

    [GeneratedRegex(@"\s{2,}", RegexOptions.Compiled)]
    private static partial Regex MultiWhitespaceRegex();
}
