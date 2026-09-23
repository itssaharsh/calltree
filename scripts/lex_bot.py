"""Create or update the Calltree Lex V2 bot and print its ids.

    python scripts/lex_bot.py --profile firstcommit --region us-east-1

Six intents, one per possible answer class, plus the built-in fallback. The bot does the
understanding; backend/src/lib/decide.mjs does the deciding. Sentiment analysis is on at the alias.
"""
from __future__ import annotations
import argparse, json, sys, time
import boto3

BOT_NAME = "CalltreeCheckin"
ROLE_NAME = "calltree-lex-role"
LOCALE = "en_US"
INTENTS = {
    "FeelingFine": ["I'm fine", "I am fine", "fine", "fine thank you", "I'm okay", "I'm ok", "okay", "I'm alright", "alright", "I'm good", "good", "doing good", "doing well", "I'm well", "very well thank you", "feeling fine", "feeling good", "feeling alright", "pretty good", "I'm doing fine thank you", "not bad", "I'm okay a little tired but okay", "doing fine", "I feel fine", "I feel good", "yes I'm fine", "I'm well thank you", "good good", "just fine", "I'm doing okay today", "fine fine", "oh I'm okay", "I'm alright dear", "feeling fine today", "I'm well just staying inside", "okay just watching television", "pretty good for my age", "I'm fine my son is here with me"],
    "FeelingUnwell": ["I feel dizzy", "dizzy", "I'm dizzy", "I feel light-headed", "light-headed", "I feel faint", "I fell", "I fell down", "I'm not feeling well", "not well", "I feel sick", "I'm sick", "I'm not so good", "not so good", "I have a headache", "my chest hurts", "my chest feels tight", "I can't breathe", "I'm nauseous", "I feel weak", "I'm confused", "I've been throwing up", "I feel terrible", "I'm not okay", "I don't feel good", "I feel unwell", "my heart is racing", "I'm shaking", "I passed out", "I can't get up", "I need an ambulance", "I feel woozy", "not so good I feel dizzy when I stand up", "I'm fine just a bit light-headed", "I'm okay but I fell in the kitchen", "a little nauseous", "my legs are shaking and I feel weak"],
    "HasCooling": ["yes", "yes it is", "yes the AC is on", "the AC is on", "the air conditioning is on", "air conditioning works", "the AC works", "the fan is on", "fan is on", "the cooler is running", "the swamp cooler is running", "yes and I have water", "I have water", "I have plenty of water", "it's cool in here", "yes the air is on", "yes everything is working", "the air conditioner works fine", "yes cool in here plenty of water", "the AC is on full blast", "yes it works", "yes the cooler is on", "AC is on and I have water", "the air is on and I have cold water", "yes the fan and the AC are both on", "my AC is working it is cool in here", "yes air conditioning and a fan", "the AC works and I drank some water", "yes it's cool inside", "the air is on"],
    "NoCooling": ["no it's not working", "no AC", "the AC is broken", "the air conditioning is broken", "AC broke", "the AC isn't working", "the air conditioner is not working", "the AC stopped working", "no fan", "the power is out", "the power went out", "no power", "no electricity", "it's too hot in here", "it is very hot in here", "so hot", "I have no water", "I'm out of water", "the cooler is weak", "nothing is running", "no air", "the fan doesn't work", "we have no power since noon", "my fan works but it's still too hot", "the AC has been broken since Tuesday", "the power went out this morning so nothing is running", "it's so hot in here the cooler is weak", "no AC just a small fan", "the AC stopped working last night", "it is very hot the AC is weak"],
    "NeedsSomething": ["I need water", "I need help", "I need my medication", "could someone bring my medication", "can someone bring water", "some ice would help", "a fan would be nice", "I could use some water", "I ran out of water", "could someone bring groceries", "I need my prescription", "I need someone to come", "maybe someone should come by", "please send someone", "bring me ice", "I need food", "help", "ice please", "water would help", "some ice or a fan would help if possible", "yes I need something", "I could use a fan", "I could use some water I ran out yesterday", "could someone bring my medication I cannot get to the pharmacy", "a fan or ice would help", "water would help I'm nearly out", "I need my prescription picked up I can't drive", "some ice please", "I can't get up from the chair could someone come"],
    "NeedsNothing": ["no", "no thank you", "nothing", "nothing thank you", "I don't need anything", "no I don't need anything", "I'm fine thank you", "no I'm fine", "I'm all set", "nothing right now", "no nothing at all", "I don't need a thing", "no thanks", "I have everything", "no we're fine", "nothing dear", "no I'll manage", "no all good", "no I'm good", "I'm okay thanks", "nothing thank you for calling", "no I'm fine my daughter is coming later", "no nothing needed", "nope", "no I don't think so", "no I have everything", "nothing thanks", "no all set"],
}

def wait(fn, ok, what, timeout=600):
    t0 = time.time()
    while True:
        try:
            s = fn()
        except Exception as e:  # eventual consistency right after create_* calls
            if "ResourceNotFound" in type(e).__name__ or "does not exist" in str(e):
                if time.time() - t0 > 120: raise
                time.sleep(5); continue
            raise
        if s in ok: return s
        if s in ("Failed", "Deleting"): raise SystemExit(f"{what} -> {s}")
        if time.time() - t0 > timeout: raise SystemExit(f"{what} timed out at {s}")
        time.sleep(5)

def ensure_role(iam):
    trust = {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lexv2.amazonaws.com"}, "Action": "sts:AssumeRole"}]}
    try:
        return iam.get_role(RoleName=ROLE_NAME)["Role"]["Arn"]
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(RoleName=ROLE_NAME, AssumeRolePolicyDocument=json.dumps(trust), Description="Calltree Lex V2 bot runtime role")["Role"]["Arn"]
        iam.put_role_policy(RoleName=ROLE_NAME, PolicyName="lex-runtime", PolicyDocument=json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": ["polly:SynthesizeSpeech", "comprehend:DetectSentiment"], "Resource": "*"}]}))
        time.sleep(10)
        return arn

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--profile", default="firstcommit"); p.add_argument("--region", default="us-east-1")
    a = p.parse_args()
    s = boto3.Session(profile_name=a.profile, region_name=a.region)
    lex, iam = s.client("lexv2-models"), s.client("iam")
    # duplicate utterances across intents make the build fail
    seen = {}
    for name, utts in INTENTS.items():
        for u in utts:
            k = u.lower().strip()
            if k in seen and seen[k] != name: raise SystemExit(f"duplicate utterance '{u}' in {seen[k]} and {name}")
            seen[k] = name
    role = ensure_role(iam)
    bots = [b for b in lex.list_bots(filters=[{"name": "BotName", "values": [BOT_NAME], "operator": "EQ"}])["botSummaries"]]
    if bots:
        bot_id = bots[0]["botId"]; print(f"bot exists {bot_id}", file=sys.stderr)
    else:
        bot_id = lex.create_bot(botName=BOT_NAME, description="Calltree heat check-in: understands the three answers", roleArn=role, dataPrivacy={"childDirected": False}, idleSessionTTLInSeconds=300)["botId"]
        wait(lambda: lex.describe_bot(botId=bot_id)["botStatus"], {"Available"}, "bot")
        print(f"created bot {bot_id}", file=sys.stderr)
    locales = [l for l in lex.list_bot_locales(botId=bot_id, botVersion="DRAFT")["botLocaleSummaries"] if l["localeId"] == LOCALE]
    if not locales:
        lex.create_bot_locale(botId=bot_id, botVersion="DRAFT", localeId=LOCALE, nluIntentConfidenceThreshold=0.40, voiceSettings={"voiceId": "Joanna", "engine": "neural"})
        wait(lambda: lex.describe_bot_locale(botId=bot_id, botVersion="DRAFT", localeId=LOCALE)["botLocaleStatus"], {"NotBuilt", "Built", "ReadyExpressTesting"}, "locale")
    existing = {i["intentName"]: i["intentId"] for i in lex.list_intents(botId=bot_id, botVersion="DRAFT", localeId=LOCALE, maxResults=100)["intentSummaries"]}
    for name, utts in INTENTS.items():
        samples = [{"utterance": u} for u in utts]
        if name in existing:
            lex.update_intent(botId=bot_id, botVersion="DRAFT", localeId=LOCALE, intentId=existing[name], intentName=name, sampleUtterances=samples)
        else:
            lex.create_intent(botId=bot_id, botVersion="DRAFT", localeId=LOCALE, intentName=name, sampleUtterances=samples)
        print(f"intent {name}: {len(utts)} utterances", file=sys.stderr)
    lex.build_bot_locale(botId=bot_id, botVersion="DRAFT", localeId=LOCALE)
    wait(lambda: lex.describe_bot_locale(botId=bot_id, botVersion="DRAFT", localeId=LOCALE)["botLocaleStatus"], {"Built"}, "build")
    print("built", file=sys.stderr)
    version = lex.create_bot_version(botId=bot_id, botVersionLocaleSpecification={LOCALE: {"sourceBotVersion": "DRAFT"}})["botVersion"]
    wait(lambda: lex.describe_bot_version(botId=bot_id, botVersion=version)["botStatus"], {"Available"}, "version")
    aliases = [x for x in lex.list_bot_aliases(botId=bot_id)["botAliasSummaries"] if x["botAliasName"] == "live"]
    alias_kwargs = dict(botAliasName="live", botVersion=version, botAliasLocaleSettings={LOCALE: {"enabled": True}}, sentimentAnalysisSettings={"detectSentiment": True})
    if aliases:
        alias_id = aliases[0]["botAliasId"]
        lex.update_bot_alias(botId=bot_id, botAliasId=alias_id, **alias_kwargs)
    else:
        alias_id = lex.create_bot_alias(botId=bot_id, **alias_kwargs)["botAliasId"]
    wait(lambda: lex.describe_bot_alias(botId=bot_id, botAliasId=alias_id)["botAliasStatus"], {"Available"}, "alias")
    print(json.dumps({"botId": bot_id, "botAliasId": alias_id, "version": version, "roleArn": role}))

if __name__ == "__main__":
    main()
