# Proof that the coding agent was connected to AWS

Claude Code ran with the **AWS MCP server** (Agent Toolkit for AWS) signed in as the same IAM user the console uses (`arn:aws:iam::277025716889:user/Laptop`). Every call below appears in CloudTrail for account 277025716889 in us-east-1 with the MCP user agent.

## Verbatim tool results from the session (23 Sep 2026, UTC)

`sts:GetCallerIdentity`
```json
{"UserId":"AIDAUBAAE7KMXVBCX7R5K","Account":"277025716889","Arn":"arn:aws:iam::277025716889:user/Laptop"}
```

`bedrock-runtime:Converse` (every model tried, four regions)
```
ValidationException: An error occurred (ValidationException) when calling the Converse operation: Operation not allowed
```

`connect:CreateInstance`
```
InvalidRequestException: You're signed in with an AWS account that was provided by AISPL. These accounts cannot create
Amazon Connect instances. Sign in using an account provided by AWS, and then try to create an instance.
```

`chime-sdk-voice:SearchAvailablePhoneNumbers`
```
ForbiddenException: AWSAccountId = 277025716889 is not authorized due to not supported countryCode = IN
```

`location:CreateKey`
```
AccessDeniedException: User: arn:aws:iam::277025716889:user/Laptop is not authorized to perform: ... CreateKey
```

`sesv2:CreateEmailIdentity` → `EMAIL_ADDRESS` (verification sent). `sesv2:GetAccount` → `ProductionAccessEnabled: false` (sandbox).

Each of these changed the design (see `docs/adr/`). The full timeline is in `DEVLOG.md`.

## How to verify yourself

CloudTrail → Event history → filter **User name = Laptop**, 23 Sep 2026. You will see `CreateInstance` (Connect), `SearchAvailablePhoneNumbers` (Chime), `Converse` (Bedrock), `CreateKey` (Location), `CreateBot`/`BuildBotLocale` (Lex), the CloudFormation stack events for `calltree`, and the Amplify deployments, in the order the agent made them.

## Screenshots

`docs/proof/*.png`: the agent's session with the AWS MCP tool calls, added by the builder before submission.
