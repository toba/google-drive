/**
 * Google access scopes. These values inform the consent screen that Google
 * displays to the user. Scopes enable your application to only request access
 * to the resources that it needs while also enabling users to control the
 * amount of access that they grant to your application. Thus, there is an
 * inverse relationship between the number of scopes requested and the
 * likelihood of obtaining user consent.
 *
 * @see https://developers.google.com/drive/web/scopes
 */
export var Scope;
(function (Scope) {
    Scope["DriveReadWrite"] = "https://www.googleapis.com/auth/drive";
    Scope["DriveMetadata"] = "https://www.googleapis.com/auth/drive.metadata";
    Scope["DriveReadOnly"] = "https://www.googleapis.com/auth/drive.readonly";
    Scope["DriveMetadataReadOnly"] = "https://www.googleapis.com/auth/drive.metadata.readonly";
    Scope["PhotoReadOnly"] = "https://www.googleapis.com/auth/drive.photos.readonly";
    Scope["Calendar"] = "https://www.googleapis.com/auth/calendar";
})(Scope || (Scope = {}));
