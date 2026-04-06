using System.Security.Claims;
using NorthStarShelter.API.Models;

namespace NorthStarShelter.API.Helpers;

public static class SensitiveData
{
    public static void ApplyResidentNotesPolicy(Resident r, ClaimsPrincipal user)
    {
        if (PiiAccess.CanViewRestrictedNotes(user)) return;
        r.NotesRestricted = null;
    }

    public static void ApplyProcessRecordingNotesPolicy(ProcessRecording r, ClaimsPrincipal user)
    {
        if (PiiAccess.CanViewRestrictedNotes(user)) return;
        r.NotesRestricted = null;
    }
}
