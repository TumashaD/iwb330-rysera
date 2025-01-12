import Server.db;
import Server.estimator;
import Server.google_drive;
import Server.google_sheets;
import Server.quotation_generator;
import Server.utils;
import Server.volume_calculator;

import ballerina/http;
import ballerina/log;
import ballerina/mime;
import ballerinax/googleapis.drive;

// Define the list of valid API keys
type Vector [float, float, float];

public type Product record {
    string name;
    int quantity;
    decimal rate;
};

public type orderData record {|
    string customerName;
    string customerEmail;
    string[] fileNames;
    string[] fileURLs;
    int[] quantities;
    decimal[] prices;
|};

configurable string mongoDBConnectionString = ?; //mongodb connection string
configurable string estimatorApiKey = ?;
configurable string OAuthRefreshToken = ?;
configurable string OAuthClientId = ?;
configurable string OAuthClientSecret = ?;
configurable string ZohoclientID = ?;
configurable string ZohoclientSecret = ?;
configurable string ZohorefreshToken = ?;
configurable string ZohoorganizationId = ?;

//define mongoDB database
final db:Database db = check new (mongoDBConnectionString);
final estimator:estimatorService estimator = check new (estimatorApiKey);
final google_drive:driverService googleDriveService = check new (OAuthRefreshToken, OAuthClientId, OAuthClientSecret);
final volume_calculator:VolumeCalculator volume_calculator = new ();
final utils:googleService googleService = check new ();
final quotation_generator:ZohoQuotationService quotation_generator = check new (ZohoclientID, ZohoclientSecret, ZohorefreshToken, ZohoorganizationId);
final google_sheets:sheetsService sheetsService = check new (OAuthRefreshToken, OAuthClientId, OAuthClientSecret);

http:CorsConfig corsConfig = {
    allowOrigins: ["http://localhost:5173"],
    allowCredentials: true,
    allowHeaders: ["X-Api-Key", "Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    maxAge: 3600
};


@http:ServiceConfig {
    cors: corsConfig
}

service / on new http:Listener(9090) {

    // Define a simple GET resource to return a greeting
    resource function get greeting(http:RequestContext ctx) returns string {
        return "Hello, World!";
    }

    resource function get getUser(@http:Query string jwt) returns json|http:Unauthorized|error {
        json|http:Unauthorized|error result = googleService.decodeGoogleJWT(jwt);
        if result is json {
            //check if user exists in the database
            db:User|() user = check db.getUser(check result.sub);
            if (user is db:User) {
                return user;
            } else {
                return ();
            }
        } else {
            return result;
        }
    }

    resource function post registerUser(@http:Query string jwt, db:UserData userData) returns json|http:Unauthorized|error {
        json|http:Unauthorized|error result = googleService.decodeGoogleJWT(jwt);

        if result is json {
            db:User user = {
                uid: check result.sub,
                email: check result.email,
                name: userData.name,
                avatar: check result.picture,
                organization: userData.organization,
                contact: userData.contact
            };

            //add user to the database
            check db.addUsers(user);
            return user;
        } else {
            return result;
        }
    }

    resource function post upload(http:Request request) returns json|error {
        log:printInfo("File upload request received");
        // Extract the file from multipart request
        mime:Entity[] bodyParts = check request.getBodyParts();
        foreach var part in bodyParts {
            if part.getContentDisposition().name == "file" {
                // Get file details
                string fileName = part.getContentDisposition().fileName;
                if fileName == "" {
                    fileName = "uploaded-file";
                }
                byte[] fileContent = check part.getByteArray();

                // Upload the file to Google Drive
                drive:File|error uploadedFileResult = googleDriveService.uploadFile(fileContent, fileName, "1-DDCsqJJRTkBOvzDvTX-qHhYOI-Bpf6n");

                // Calculate the volume of the file
                float|error volume = volume_calculator.parseSTL(fileContent);

                if uploadedFileResult is drive:File {
                    if volume is float {
                        log:printInfo("Volume calculated successfully: " + volume.toString());
                        string fileID = uploadedFileResult.id.toString();
                        string url = string `https://drive.usercontent.google.com/download?id=${fileID}&confirm=xxx`;
                        json response = {
                            "url": url,
                            "volume": volume
                        };
                        return response;
                    } else {
                        return error("Volume calculation failed: " + volume.toString());
                    }
                } else {
                    return error("File upload failed: " + uploadedFileResult.toString());
                }

            }
        }

        return error("No file found in the request");
    }

    resource function post setOrders(@http:Query string jwt, db:Order[] newOrders) returns json|http:Unauthorized|error {
        json|http:Unauthorized|error result = googleService.decodeGoogleJWT(jwt);

        if result is json {
            //add user to the database
            check db.addOrders(newOrders);
            return "order added successfully";
        } else {
            return result;
        }
    }

    resource function get getOrders(@http:Query string jwt) returns json|http:Unauthorized|error {
        json|http:Unauthorized|error result = googleService.decodeGoogleJWT(jwt);
        if result is json {
            db:Order[]|error? orders = db.getOrders(check result.sub);
            if orders is db:Order[] {
                return orders;
            } else {
                return error("Failed to retrieve orders");
            }
        } else {
            return error("Failed to retrieve orders");
        }
    }

    resource function post estimate(@http:Payload json jsonObj) returns json|error {
        string url = check jsonObj.url;
        float weight = check jsonObj.weight;
        json|error result = estimator.estimate(url);
        string time;

        if result is json {
            float price = check result.data.price;
            float lkrPrice = price * 300;
            float finalPrice = (lkrPrice < 2000.0)
                ? 24124 - 53.5 * lkrPrice + 0.0386 * lkrPrice * lkrPrice - 8.82e-6 * lkrPrice * lkrPrice * lkrPrice
                : 12151 - 10.6 * lkrPrice + 3.29e-3 * lkrPrice * lkrPrice - 2.88e-7 * lkrPrice * lkrPrice * lkrPrice;
            int printingCost = <int>(finalPrice / 3.5 - 6 * weight);
            if (printingCost < 0) {
                weight = weight / 1.5;
            }
            int totalminutes = <int>((finalPrice / 3.5 - 6 * weight) / 0.69);
            if (totalminutes < 0) {
                time = "0";
            }
            else {
                time = string `${totalminutes / 60} hr ${totalminutes % 60} m`;
            }
            json response = {
                "price": finalPrice.round(2),
                "time": time
            };
            return response;
        } else {
            return error("Estimation failed: " + result.toString());
        }
    }

    resource function post quote(@http:Payload json payload) returns json|error {
        // Convert the payload to a map<json> for easier key checking
        map<json> jsonObj = check payload.ensureType();

        // Parse the request payload
        string customer = check jsonObj.get("customer").ensureType();
        string email = check jsonObj.get("email").ensureType();
        json[] productsJson = check jsonObj.get("products").ensureType();

        Product[] products = [];
        foreach json productJson in productsJson {
            map<json> product = check productJson.ensureType();

            string name = check product.get("name").ensureType();

            int quantity = check product.get("quantity").ensureType();

            decimal rate = check product.get("rate").ensureType();

            products.push({name, quantity, rate});
        }

        // Call the createQuotation function
        json|error quotation = check quotation_generator.createQuotation(email, customer, products);

        if quotation is json {
            log:printInfo("Quotation generated successfully: " + quotation.toString());
            return quotation;
        } else {
            return error("Quotation generation failed: " + quotation.toString());
        }

        
    }

    resource function post sendToSheet(http:Request req) returns error? {
        // Convert the payload to a map<json> for easier key checking
        map<json> jsonObj = check req.getJsonPayload().ensureType();
        // Parse the request payload
        string customer = check jsonObj.get("customer").ensureType();
        string email = check jsonObj.get("email").ensureType();
        json[] productsJson = check jsonObj.get("products").ensureType();
        string[] fileNames = [];
        string[] fileURLs = [];
        int[] quantities = [];
        decimal[] prices = [];
        foreach json productJson in productsJson {
            map<json> product = check productJson.ensureType();

            string name = check product.get("name").ensureType();

            string url = check product.get("url").ensureType();

            int quantity = check product.get("quantity").ensureType();

            decimal rate = check product.get("rate").ensureType();

            fileNames.push(name);
            quantities.push(quantity);
            prices.push(rate);
            fileURLs.push(url);
        }
        orderData orderData = {
            customerName: customer,
            customerEmail: email,
            fileNames: fileNames,
            fileURLs: fileURLs,
            prices: prices,
            quantities: quantities
        };

        error? addOrderResult = sheetsService.addOrder("1is2fVRLwfFtmg6Dna-5NFqynw6vhtBAwti53g_qeIdM", "Orders", orderData);

        if addOrderResult is error {
            return;
        }
        else {
            log:printInfo("Order added successfully");
            return;
        }
    }
}
