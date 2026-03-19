Skip to:

1. [Top Bar](https://directpayonline.atlassian.net/wiki/spaces/API/pages/36110341/createToken+V6#_R255l6va6paq_)
2. [Banner](https://directpayonline.atlassian.net/wiki/spaces/API/pages/36110341/createToken+V6#AkBanner)
3. [Sidebar](https://directpayonline.atlassian.net/wiki/spaces/API/pages/36110341/createToken+V6#side-navigation)
4. [Main Content](https://directpayonline.atlassian.net/wiki/spaces/API/pages/36110341/createToken+V6#AkMainContent)

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

createToken(V6)

[Updated Nov 24, 2025](https://directpayonline.atlassian.net/wiki/spaces/API/history/36110341)

More actions

# createToken(V6)

![](https://directpayonline.atlassian.net/wiki/aa-avatar/557058:9e14f8fb-420f-47bd-a8bf-45dda9768a75)

By Rahamim Glauberg \[INACTIVE\] (Deactivated)

Nov 24, 2025

9 min

1

### Description

The createToken will create a transaction in the Direct Pay Online system, it is constructed from 5 levels:

### Request

1. **Transaction level** – **Mandatory** \- Contains all the basic transaction information

2. **Services level** – **Mandatory** \- Contains all the information regarding the services sold in the transaction – must contain at-least one service

3. **Allocations level** – Contains all the information regarding the allocation of money received from transaction to be paid to other providers in Direct Pay Online system. If this level is not sent, the system will allocate all the money from this transaction to the provider

4. **Additional level** – Contains an option to block specific payment options in the transaction (for example, on an application which needs fast payment, block off Direct Pay Online bank payment)

5. **Travelers level**– Contains information regarding travelers (passengers / guests) which will a process in Direct Pay Online system to verify that one of the payers name matches the name of one of the travelers


**URL:** [https://secure.3gdirectpay.com/API/v6/](https://secure.3gdirectpay.com/API/v6/ "https://secure.3gdirectpay.com/API/v6/")

### Response

The method will respond with the result of your request.

### Variables to send:

|     |     |     |     |
| --- | --- | --- | --- |
| **Parameter** | **Data type** | **Description** |  |
| CompanyToken | Token | Token you got from 3G to operate this API | **Mandatory** |
| Request | Text | createToken | **Mandatory** |

Transaction level _(Mandatory)_:

**Transaction must be wrapped in <Transaction\> tag.**

##### **Transaction example**

`<Transaction>
	<PaymentAmount>300</PaymentAmount>
	<PaymentCurrency>tzs</PaymentCurrency>
	<CompanyRefUnique>1</CompanyRefUnique>
	<CompanyRef>YourRef12345</CompanyRef>
	<OriginatorSourceID> 8777250772</OriginatorSourceID>
	<OrderNumber> 735487493</OrderNumber>
	<PTL>56</PTL>
	<customerFirstName>John</customerFirstName>
	<customerLastName>Doe</customerLastName>
	<customerEmail>test@directpayonline.com</customerEmail>
	<DefaultPayment>MO</DefaultPayment>
	<DefaultPaymentCountry>Tanzania</DefaultPaymentCountry>
	<DefaultPaymentMNO>Tigo</DefaultPaymentMNO>
	<TransactionSource>Mobile</TransactionSource>
	<MetaData>
    	<![CDATA[\
    	{\
    		"key": "Value",\
    		.......\
    	}\
    	]]>
	</MetaData>
</Transaction>`

Variables to be sent at Transaction level:

|     |     |     |     |
| --- | --- | --- | --- |
| **Parameter** | **Data type** | **Description** |  |
| PaymentAmount | Money | Total amount in the selected currency. No more than 2 digits after the comma | **Mandatory** |
| PaymentCurrency | Text | From table of options as accepted from DPO | **Mandatory** |
| CompanyRef | Text | Company reference number, i.e also referred to as Booking ref | Optional |
| OriginatorSourceID | Text (15 bytes) | Third party unique transaction identifier | Optional |
| OrderNumber | Text (15 bytes) | Merchant order reference number | Optional |
| RedirectURL | Text | URL to redirect the customer after the payment.<br>The customer will be redirected to this URL with the below variables in GET method.<br>You can send your link with additional variables, the system will recognize it and the additional variables will be sent out with “&” instead of “?” in the beginning.<br>Variables:<br>- TransID - Transaction ref.<br>  <br>- CCDapproval - Approval number<br>  <br>- PnrID - Customer ref<br>  <br>- TransactionToken - Transaction ref. (repeated)<br>  <br>- CompanyRef - Customer ref. (repeated) | Optional |
| BackURL | Text | URL to let the customer go back from the payment page.<br>The customer will be redirected to this URL with "TransactionToken" and "CompanyRef" variables in GET method. You can send your link with additional variables, the system will recognize it and the additional variables will be sent our with "&" instead of "?" in the beginning | Optional |
| CompanyRefUnique | Boolean | Tells the system to verify if the company reference number (transaction ID given by the provider) given is already in the system and paid, if so, returns error to API result.This is to prevent double payments | Optional.<br>Default: **False** |
| PTL | Number | Number of hours to payment time limit | Optional.<br>Default: **96 hours** |
| PTLtype | Text | Define if “PTL” tag is hours or minutes. options: “hours” or “minutes” | Optional.<br>Default: **hours** |
| TransactionChargeType | Number | Type of transaction:<br>- **1 for Charge** \- immediate charge<br>  <br>- **2 for Authorize-Manual** \- for an authorization process and then manual charge using “chargeToken”<br>  <br>- **3 for Authorize-Auto** \- for authorization process and then automatically charge on chosen date | Optional.<br>Default: **1 (Charge)** |
| TransactionAutoChargeDate | DateTime | Date and time of automatic charge of transaction, if authorized by that date.<br>Formats: YYYY/MM/DD HH:MM(:SS), YYYY/MM/DD, YYYY-MM-DD HH:MM(:SS), YYYY-MM-DD | Optional/ **Mandatory** if TransactionChargeType=”Authorize-Auto” |
| customerEmail | Text | E-mail of the customer to send the link | Optional |
| customerFirstName | Text | Customer name | Optional |
| customerLastName | Text | Customer last name | Optional |
| customerAddress | Text | Customer address | Optional |
| customerCity | Text | Customer city | Optional |
| customerCountry | ISO code | Customer country ISO 2 letter code<br>[http://en.wikipedia.org/wiki/ISO\_3166-1](http://en.wikipedia.org/wiki/ISO_3166-1 "http://en.wikipedia.org/wiki/ISO_3166-1") | Optional |
| customerDialCode | ISO code | Customer country ISO 2 letter code | Optional |
| customerPhone | Number | Customer Phone number | Optional |
| customerZip | Text | Customer zip code | Optional |
| DemandPaymentbyTraveler | Boolean (1/0) | If marked as 1, the system will require one of the travelers which are included in the travelers tag to be the payer. | Optional |
| EmailTransaction | Boolean (1/0) | If marked as 1, the system will send the customer an e-mail about the transaction with a link to pay | Optional |
| CompanyAccRef | Text | Internal accounting reference number | Optional |
| userToken | Token | To define who created the transaction | Optional |
| DefaultPayment | Text | The code of the default payment option (the one to be displayed first in the payment page), options:<br>- CC – Credit card<br>  <br>- MO – Mobile<br>  <br>- PP – PayPal<br>  <br>- BT – Bank transfer<br>  <br>- XP – xPay | Optional |
| DefaultPaymentCountry | Text | Should be used only for Mobile default payment.<br>Name of the default country for the payment option (DefaultPayment will work without this option too)<br>_**Ex.:**_ <DefaultPaymentCountry>kenya</DefaultPaymentCountry> | Optional |
| DefaultPaymentMNO | Text | Should be used only for Mobile default payment.<br>Name of the default MNO (mobile network operator) for the payment option (DefaultPayment will work without this option too)<br>_**Ex.:**_ <DefaultPaymentMNO>mpesa</DefaultPaymentMNO> | Optional |
| TransactionToPrep | Boolean (1/0) | Will mark the transaction as Marketplace Prep | Optional |
| `AllowRecurrent` | Boolean (1/0) | Will allow payment via recurrent | Optional |
| FraudTimeLimit | Number | Set fraud time limit in minutes (from current date) | Optional |
| Voidable | Boolean (1/0) | If this tag sent, transaction will be checked in scoring process, if 0 and scoring above high risk/very high risk then will be blocked, if 1 then will go to a check by DPO support team | Optional |
| ChargeType | Text |  | Optional |
| TRANSmarketplace | Number | If this tag is sent, allocation amount will be update based on the API\_GetCCTclientprecentage stored proc | Optional |
| TRANSblockCountries | Boolean (1/0) | transaction block countries | Optional |
| MetaData | Text(2000) | Some custom data, that need store for specify transaction (Max allowed 2000 symbols) | Optional |
| SMSTransaction | Boolean (1/0) | sms transaction | Optional |
| TransactionType | Text | If set, update the transaction status id based on it | Optional |
| DeviceId | Text | In use if transaction type is duma directpay | Optional |
| DeviceCountry | Text | In use if transaction type is duma directpay | Optional |
| `TransactionSource` | Text | This field will indicate the source of the transaction. If none provided the default source will be applied (default = **API**).<br>Available sources (more can be added if needed):<br>- Computer<br>  <br>- Mobile<br>  <br>- API<br>  <br>- Website<br>  <br>- Catalogue<br>  <br>- Realtime Settlement<br>  <br>- DPO Card<br>  <br>- DPO Store<br>  <br>- Lite Portal<br>  <br>- Marketplace<br>  <br>- Pay My Bills<br>  <br>- Shopify<br>  <br>- Wordpress<br>  <br>- Magento<br>  <br>- Whcms<br>  <br>- Wix<br>  <br>- Ecwid <br>  <br>- Android SDK<br>  <br>- IOS SDK<br>  <br>- DPO Pay mobile Android<br>  <br>- DPO Pay mobile IOS<br>  <br>- POS<br>  <br>- sPOS | Optional |

### Service level _(Mandatory)_:

**Services must be wrapped in <Services> tag and each services must be wrapped in <Service> tag**, there is no limit in individual services to be sent in services tag.

##### **Services example**

`<Services>
<Service>
    <ServiceType>33</ServiceType>
    <ServiceDescription>Service number 1</ServiceDescription>
    <ServiceDate>2018/01/20 19:00</ServiceDate>
</Service>
    <Service>
    	<ServiceType>39</ServiceType>
    	<ServiceDescription>Service number 2</ServiceDescription>
    	<ServiceDate>2018/01/20 19:00</ServiceDate>
		<ServiceFrom>JFK</ServiceFrom>
    	<ServiceTo>CDG</ServiceTo>
</Service>
<Service>
    	<ServiceTypeName>Commission</ServiceTypeName>
    	<ServiceDescription>Service number 2</ServiceDescription>
    	<ServiceDate>2018/01/20 19:00</ServiceDate>
		<ServiceFrom>JFK</ServiceFrom>
    	<ServiceTo>CDG</ServiceTo>
</Service>
</Services>`

Variables to be sent at Services level:

|     |     |     |     |
| --- | --- | --- | --- |
| **Parameter** | **Data type** | **Description** |  |
| ServiceDescription | Text | The description of the payment made | **Mandatory** |
| **ServiceType** | Number | Service type number according to the options accepted from DPO | **Mandatory-Optional**(Need send ServiceType or ServiceTypeName) |
| **ServiceTypeName** | Text | Service type name according to the options accepted from DPO | **Mandatory-Optional**(Need send ServiceType or ServiceTypeName) |
| ServiceDate | DateTime | Service date of the booked service<br>Format: YYYY/MM/DD HH:MM | **Mandatory** |
| ServiceFrom | Iata | 3 letters departure airport code | Optional |
| ServiceTo | Iata | 3 letters destination airport code | Optional |
| ServiceRef | Text | Service Reference | Optional |

### Allocations level _(Optional)_:

**Allocations must be wrapped in <Allocations> tag and each allocation in <Allocation> tag.** The limit for an allocation must be the 89% of the total of the transaction. Some fields are mandatory for each allocation sent.

##### **Allocations level**

`<Allocations>
<Allocation>
    <AllocationCode>demo1</AllocationCode>
    <AllocationAmount>130.00</AllocationAmount>
    <AllocationServiceType>39</AllocationServiceType>
</Allocation>
<Allocation>
    <AllocationCode>demo2</AllocationCode>
    <AllocationAmount>40.00</AllocationAmount>
    <AllocationServiceType>33</AllocationServiceType>
	<AllocationServiceDescription>Description of the allocation</AllocationServiceDescription>
</Allocation>
</Allocations>`

Variables to be sent at Allocation level:

|     |     |     |     |
| --- | --- | --- | --- |
| **Parameter** | **Data type** | **Description** |  |
| AllocationCode | Text | The code of the other provider to allocate money to. | **Mandatory** |
| AllocationAmount | Money | The allocated amount | **Mandatory** |
| AllocationServiceType | Number | Allocation service type from list of services | **Mandatory** |
|  |

Collapse action bar

Open Comments Panel

Open Details Panel

Rovo Button

Add a comment

![thumbs up](https://directpayonline.atlassian.net/gateway/api/emoji/15c47bb0-099a-4136-a715-96987491f3fc/1f44d/path?scale=MDPI)

1

{"serverDuration": 44, "requestCorrelationId": "8ea6cfa4b4bd4cc0b21f295896cd8d7b"}