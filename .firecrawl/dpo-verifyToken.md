Skip to:

1. [Top Bar](https://directpayonline.atlassian.net/wiki/spaces/API/pages/32702465/verifyToken+V6#_R255l6va6paq_)
2. [Banner](https://directpayonline.atlassian.net/wiki/spaces/API/pages/32702465/verifyToken+V6#AkBanner)
3. [Sidebar](https://directpayonline.atlassian.net/wiki/spaces/API/pages/32702465/verifyToken+V6#side-navigation)
4. [Main Content](https://directpayonline.atlassian.net/wiki/spaces/API/pages/32702465/verifyToken+V6#AkMainContent)

Atlassian uses cookies to improve your browsing experience, perform analytics and research, and conduct advertising. Accept all cookies to indicate that you agree to our use of cookies on your device. [Atlassian cookies and tracking notice, (opens new window)](https://www.atlassian.com/legal/cookies)

PreferencesOnly necessaryAccept all

Collapse sidebar

Switch sites or apps

[Confluence](https://directpayonline.atlassian.net/wiki)

Search

Create

Create

Help

Log in

Spaces

Apps

* * *

[DPO Public API](https://directpayonline.atlassian.net/wiki/spaces/API/overview?homepageId=807369)

![](https://directpayonline.atlassian.net/wiki/images/logo/default-space-logo-256.png)

More actions

Back to top

Content

Results will update as you type.

- [MNO Advisory](https://directpayonline.atlassian.net/wiki/spaces/API/pages/3753476097/MNO+Advisory)

- [Version 6 (V6)](https://directpayonline.atlassian.net/wiki/spaces/API/pages/808715/Version+6+V6)









  - [Super Wallet](https://directpayonline.atlassian.net/wiki/spaces/API/pages/818578/Super+Wallet)

  - [Basic transaction operations](https://directpayonline.atlassian.net/wiki/spaces/API/pages/1356067/Basic+transaction+operations)









    - [createToken(V6)](https://directpayonline.atlassian.net/wiki/spaces/API/pages/36110341/createToken+V6)

    - [refundToken](https://directpayonline.atlassian.net/wiki/spaces/API/pages/808949/refundToken)

    - [emailToToken](https://directpayonline.atlassian.net/wiki/spaces/API/pages/1356513/emailToToken)

    - [mVISA QR code](https://directpayonline.atlassian.net/wiki/spaces/API/pages/809204/mVISA+QR+code)

    - [updateToken](https://directpayonline.atlassian.net/wiki/spaces/API/pages/1356128/updateToken)

    - [verifyToken(V6)](https://directpayonline.atlassian.net/wiki/spaces/API/pages/32702465/verifyToken+V6)

    - [VerifyXpay](https://directpayonline.atlassian.net/wiki/spaces/API/pages/505413687/VerifyXpay)

    - [cancelToken](https://directpayonline.atlassian.net/wiki/spaces/API/pages/1356406/cancelToken)
  - [Transaction payment options (V6)](https://directpayonline.atlassian.net/wiki/spaces/API/pages/808771/Transaction+payment+options+V6)

  - [xPay payments](https://directpayonline.atlassian.net/wiki/spaces/API/pages/86736901/xPay+payments)

  - [Merchant operations](https://directpayonline.atlassian.net/wiki/spaces/API/pages/86704137/Merchant+operations)

  - [usrAuth (V6)](https://directpayonline.atlassian.net/wiki/spaces/API/pages/94928897/usrAuth+V6)
- [Version 7 (V7)](https://directpayonline.atlassian.net/wiki/spaces/API/pages/1214119945/Version+7+V7)

- [Listener](https://directpayonline.atlassian.net/wiki/spaces/API/pages/809280/Listener)

- [Plugins](https://directpayonline.atlassian.net/wiki/spaces/API/pages/810230/Plugins)


Blogs

Space apps

[draw.io Diagrams](https://directpayonline.atlassian.net/wiki/display/API/customcontent/list/ac%3Acom.mxgraph.confluence.plugins.diagramly%3Adrawio-diagram)

![](https://ac.draw.io/images/drawlogo48.png)

* * *

You‘re viewing this with anonymous access, so some content might be blocked.

Close

Side Navigation Drag Handle

DPO Public API

/

verifyToken(V6)

[Updated Nov 28, 2023](https://directpayonline.atlassian.net/wiki/spaces/API/history/32702465)

More actions

# verifyToken(V6)

![](https://directpayonline.atlassian.net/wiki/aa-avatar/557058:9e14f8fb-420f-47bd-a8bf-45dda9768a75)

By Rahamim Glauberg \[INACTIVE\] (Deactivated)

Nov 28, 2023

2 min

Add a reaction

### Description

The verifyToken request can be initiated at any time, and it is mandatory to verify the token when the customer will return to the application, not verifying the token within 30 minutes of transaction completed of payment, will generate an alert e-mail to the provider announcing that there was no verification process.

URL: [https://secure.3gdirectpay.com/API/v6/](https://secure.3gdirectpay.com/API/v6/ "https://secure.3gdirectpay.com/API/v6/")

### Request

The method will respond with the result of your request

### Variables to send:

|     |     |     |     |
| --- | --- | --- | --- |
| **Parameter** | **Data type** | **Description** |  |
| CompanyToken | Token | Token you got from 3G to operate this API | **Mandatory** |
| Request | Text | verifyToken | **Mandatory** |
| TransactionToken | Token | Transaction token as accepted from the URL redirected | **Mandatory**/Optional if CompanyRef is sent |
| CompanyRef | Text | Company reference number | **Mandatory**/Optional if TransactionToken is sent |
| VerifyTransaction | Boolean (1/0) | By default, the system will verify the transaction and mark it as “website verified” in 3G systems.<br>This option should be set to false if you only want to verify the transaction was made, process the details and then you can send the verifyToken again with this parameter set to true to let 3G systems know that you have successfully processed the client.<br>Send 1 to verify, 0 if you don't need. | Optional<br>Default: **1 (True)** |
| ACCref | Text | Internal accounting reference number. | Optional |
| customerPhone | Text | Customer phone number can be updated | Optional/ **Mandatory** if customerPhonePrefix sent |
| customerPhonePrefix | Number | Customer phone prefix (without +) | Optional/ **Mandatory** if customerPhone sent |
| customerEmail | Text | Customer E-mail address can be updated | Optional |

### Request example:

##### **request example**

`<?xml version="1.0" encoding="utf-8"?>
<API3G>
<CompanyToken>57466282-EBD7-4ED5-B699-8659330A6996</CompanyToken>
<Request>verifyToken</Request>
<TransactionToken>72983CAC-5DB1-4C7F-BD88-352066B71592</TransactionToken>
</API3G>`

### Response:

The server will respond for the verifyToken request according to the following results:

|     |     |     |
| --- | --- | --- |
| **Parameter** | **Data type** | **Description** |
| Result | 3 digits code | A code will be sent with the result of the request |
| ResultExplanation | Text | Free text of the result |
| CustomerName | Text | Customer name as filled in the form of 3GDirectpay payment page.Will be sent if transaction paid/failed |
| CustomerCredit | Text | 4 digits of credit cardWill be sent if transaction paid/failed |
| CustomerCreditType | Text | Credit card type |
| TransactionApproval | Text | Transaction approval numberWill be sent if transaction paid/failed |
| TransactionCurrency | Text | Currency final payment (the customer can convert the payment)Will be sent if transaction paid/failed |
| TransactionAmount | Money | Paid amount Will be sent if transaction paid/failed |
| FraudAlert | 3 digits code | According to fraud codes table |
| FraudExplnation | Text | Free text of fraud analysis |
| TransactionNetAmount | Amount | NET transaction amount |
| TransactionSettlementDate | Date | Date of transaction settlement |
| TransactionRollingReserveAmount | Amount | Transaction rolling reserve amount |
| TransactionRollingReserveDate | Date | Date of rolling reserve release |
| CustomerPhone | Text | Customer phone number |
| CustomerCountry | Text | Customer country |
| CustomerAddress | Text | Customer address |
| CustomerCity | Text | Customer city |
| CustomerZip | Text | Customer zip code |
| TransactionRollingReserveDate | Date | Date of rolling reserve release |
| MobilePaymentRequest | Text | Mobile payment request status |
| AccRef | Text | Internal accounting reference number |

### Codes in response:

|     |     |
| --- | --- |
| **Code** | **Explanation** |
| 000 | Transaction Paid |
| 001 | Authorized |
| 002 | Transaction overpaid/underpaid |
| 003 | Pending Bank |
| 005 | Queued Authorization |
| 007 | Pending Split Payment (Part Payment Transactions not fully paid) |
| 801 | Request missing company token |
| 802 | Company token does not exist |
| 803 | No request or error in Request type name |
| 804 | Error in XML |
| 900 | Transaction not paid yet |
| 901 | Transaction declined |
| 902 | Data mismatch in one of the fields - field (explanation) |
| 903 | The transaction passed the Payment Time Limit |
| 904 | Transaction cancelled |
| 950 | Request missing transaction level mandatory fields – field (explanation) |

### Codes in fraud alert:

|     |     |
| --- | --- |
| **Code** | **Explanation** |
| 000 | Genuine transaction |
| 001 | Low Risk (Not checked) |
| 002 | Suspected Fraud Alert |
| 003 | Fraud alert cleared (Merchant marked as clear) |
| 004 | Suspect Fraud Alert |
| 005 | Fraud alert cleared (Low Risk (Checked)/ Genuine transaction) |
| 006 | Black - Fraudulent transaction |

### Response example:

##### **response example**

`<?xml version="1.0" encoding="utf-8"?>
<API3G>
    <Result>000</Result>
	<ResultExplanation>Transaction Paid</ResultExplanation>
	<CustomerName>Cons Connie </CustomerName>
	<CustomerCredit></CustomerCredit>
	<CustomerCreditType>Mobile</CustomerCreditType>
	<TransactionApproval>RHP2ZIGD5U</TransactionApproval>
	<TransactionCurrency>KES</TransactionCurrency>
	<TransactionAmount>1.00</TransactionAmount>
	<FraudAlert>001</FraudAlert>
	<FraudExplnation>Low Risk (Not checked)</FraudExplnation>
	<TransactionNetAmount>0.99</TransactionNetAmount>
	<TransactionSettlementDate>2023/09/04</TransactionSettlementDate>
	<TransactionRollingReserveAmount>0.00</TransactionRollingReserveAmount>
	<TransactionRollingReserveDate>2023/08/25</TransactionRollingReserveDate>
	<CustomerPhone>706527126</CustomerPhone>
	<CustomerCountry>Kenya</CustomerCountry>
	<CustomerAddress></CustomerAddress>
	<CustomerCity>Mbsa</CustomerCity>
	<CustomerZip></CustomerZip>
	<MobilePaymentRequest>Not sent</MobilePaymentRequest>
	<AccRef></AccRef>
	<TransactionFinalCurrency>KES</TransactionFinalCurrency>
	<TransactionFinalAmount>1.00</TransactionFinalAmount>
</API3G>`

Collapse action bar

Open Comments Panel

Open Details Panel

Rovo Button

Add a comment

Add a reaction

{"serverDuration": 47, "requestCorrelationId": "bbfd40cd3fde41f98969874e25370401"}