import ballerina/http;
import ballerina/log;

# Represents the Zoho Books quotation service
public isolated class ZohoQuotationService {
    private final string clientId;
    private final string clientSecret;
    private final string refreshToken;
    private final string organizationId;
    private final http:Client zohoClient;
    private string accessToken = "";

    # Initialize the Zoho Books service
    #
    # + clientId - Zoho client ID
    # + clientSecret - Zoho client secret
    # + refreshToken - Zoho refresh token
    # + organizationId - Zoho organization ID
    # + return - Error if initialization fails
    public function init(string clientId, string clientSecret, string refreshToken, string organizationId) returns error? {
        self.clientId = clientId;
        self.clientSecret = clientSecret;
        self.refreshToken = refreshToken;
        self.organizationId = organizationId;

        // Initialize the HTTP client for Zoho APIs
        self.zohoClient = check new("https://www.zohoapis.com");
        
        // Get initial access token
        self.accessToken = check self.getAccessToken();
    }

    # Get access token using refresh token
    #
    # + return - Access token or error
    private isolated function getAccessToken() returns string|error {
        http:Client tokenClient = check new("https://accounts.zoho.com");
        
        string payload = string `refresh_token=${self.refreshToken}&client_id=${self.clientId}&client_secret=${self.clientSecret}&grant_type=refresh_token`;
        
        http:Response response = check tokenClient->post("/oauth/v2/token", 
            payload,
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
        );

        json responseJson = check response.getJsonPayload();
        json|error access_token = responseJson.access_token;
        if access_token is error {
            return access_token;
        }
        return access_token.toString();
    }

    # Create a contact if it doesn't exist
    #
    # + contactName - Name of the contact
    # + return - Contact ID or error
    private isolated function getOrCreateContact(string contactName) returns string|error {
        http:Response response;
        json responseJson;
        log:printInfo("Searching for contact: " + contactName);
        log:printInfo("Organization ID: " + self.organizationId);
        lock {
            // First try to get existing contact
            response = check self.zohoClient->get(
                string `/books/v3/contacts?organization_id=${self.organizationId}&contact_name=${contactName}`,
                headers = {"Authorization": string `Zoho-oauthtoken ${self.accessToken}`}
            );
        }
        responseJson = check response.getJsonPayload();
        json[] contacts = <json[]>check responseJson.contacts;
        foreach var contact in contacts {
        // Search for existing contact
            if (contact.contact_name == contactName) {
                json contactId = check contact.contact_id;
                log:printInfo("Found existing contact: " + contactName);
                return contactId.toString();
            }
        }

        // If not found, create new contact
        json contactData = {
            "contact_name": contactName,
            "contact_type": "customer"
        };
        lock {
            response = check self.zohoClient->post(
                string `/books/v3/contacts?organization_id=${self.organizationId}`,
                contactData.clone(),
                headers = {
                    "Authorization": string `Zoho-oauthtoken ${self.accessToken}`,
                    "Content-Type": "application/json"
                }
            );
        }

        responseJson = check response.getJsonPayload();
        json|error contactId = responseJson.contact.contact_id;
        if contactId is error {
            return contactId;
        }
        log:printInfo("Created new contact: " + contactName);
        return contactId.toString();
    }

    # Create a quotation in Zoho Books
    # + customerEmail - Email of the customer
    # + customerName - Name of the customer
    # + products - Array of products with name, quantity and rate
    # + return - Quotation ID or error
    public isolated function createQuotation(string customerEmail, string customerName, Product[] products) returns json|error {
        string contactId = check self.getOrCreateContact(customerName);

        json[] lineItems = [];
        foreach var product in products {
            lineItems.push({
                "name": product.name,
                "quantity": product.quantity,
                "rate": product.rate
            });
        }

        json quotationData = {
            "customer_id": contactId,
            "line_items": lineItems
        };
        lock {
            http:Response response = check self.zohoClient->post(
                string `/books/v3/estimates?organization_id=${self.organizationId}`,
                quotationData.clone(),
                headers = {
                    "Authorization": string `Zoho-oauthtoken ${self.accessToken}`,
                    "Content-Type": "application/json"
                }
            );
            json responseJson = check response.getJsonPayload();
            json|error estimateId = responseJson.estimate.estimate_id;
            if estimateId is error {
                return estimateId;
            }
            EmailDetails emailDetails = {
                toMailIds: [customerEmail]
            };
            return self.emailEstimate(estimateId.toString(), emailDetails.clone());
        }
    }

    # Get the PDF of an estimate
    # + estimateId - ID of the estimate
    # + return - PDF as a byte array or error
    // public isolated function getEstimatePdf(string estimateId) returns byte[]|error {
    //     string url = string `/books/v3/estimates/${estimateId}?organization_id=${self.organizationId}&accept=pdf`;
        
    //     lock {
    //         http:Response response = check self.zohoClient->get(
    //             url,
    //             headers = {"Authorization": string `Zoho-oauthtoken ${self.accessToken}`}
    //         );
    //         if (response.statusCode == 200) {
    //             byte[] pdf = check response.getBinaryPayload();
    //             return pdf.clone();
    //         } else {
    //             return error("Error retrieving estimate PDF. Status code: " + response.statusCode.toString());
    //         }
    //     }
        
    // }

    # Email an estimate to specified recipients
    # + emailDetails - Email details including recipients and content
    # + return - Success message or error
    public isolated function emailEstimate(string estimateId, EmailDetails emailDetails) returns json|error {
        string url = string `/books/v3/estimates/${estimateId}/email?organization_id=${self.organizationId}`;
        
        json emailData = {
            "send_from_org_email_id": emailDetails.sendFromOrgEmailId,
            "to_mail_ids": emailDetails.toMailIds,
            "subject": emailDetails?.subject ?: "Estimate from Zoho Books",
            "body": emailDetails?.body ?: "Please find the attached estimate."
        };

        lock {
            http:Response response = check self.zohoClient->post(
                url,
                emailData.clone(),
                headers = {
                    "Authorization": string `Zoho-oauthtoken ${self.accessToken}`,
                    "Content-Type": "application/json"
                }
            );
            
            if (response.statusCode == 200) {
                return check response.getJsonPayload().clone();
            } else {
                return error("Error sending estimate email. Status code: " + response.statusCode.toString());
            }
        }
    }
    
}

# Represents a product in the quotation
#
# + name - Name of the product
# + quantity - Quantity of the product
# + rate - Rate of the product
public type Product record {
    string name;
    int quantity;
    decimal rate;
};

# Represents email details for sending an estimate
#
# + sendFromOrgEmailId - Whether to send from organization email ID
# + toMailIds - Array of recipient email addresses
# + subject - Email subject
# + body - Email body content
public type EmailDetails record {
    boolean sendFromOrgEmailId = true;
    string[] toMailIds;
    string? subject = "Statement of transactions with Rysera Innovations";
    string? body = "Dear Customer,   Thanks for your business enquiry.         The estimate is attached with this email.        We can get started if you send us your consent. For any assistance you can reach us via email or phone.         Looking forward to hearing back from you. Here's an overview of the estimate for your reference.";
};