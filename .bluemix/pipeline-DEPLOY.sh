#!/bin/bash
# Called by the pipeline from the checkout directory
if [ -z ${OPENWHISK_AUTH} ]; then
  echo Skipping OpenWhisk deployment as no OpenWhisk auth key is configured
  exit 0
fi

# When pipeline runs the first time and API Key isn't populated.
if [ -z ${API_KEY} ]; then
  echo Skipping OpenWhisk deployment as no API Key is configured
  exit 0
fi

# Get the OpenWhisk CLI
mkdir ~/wsk
curl https://openwhisk.ng.bluemix.net/cli/go/download/linux/amd64/wsk > ~/wsk/wsk
chmod +x ~/wsk/wsk
export PATH=$PATH:~/wsk

# Configure the OpenWhisk CLI
wsk property set --apihost openwhisk.ng.bluemix.net --auth "${OPENWHISK_AUTH}"


# create a REDIS  service
cf create-service compose-for-redis Standard redis
# create a key for this service
cf create-service-key redis for-openwhisk
# retrieve the URL - it contains credentials + API URL
#export REDIS_URL=`cf service-key redis for-openwhisk | grep "\"uri\"" | awk -F '"' '{print $4}'`
export REDIS_URL="redis://169.51.13.228:31000"   
# create a Cloudant service
cf create-service cloudantNoSQLDB Lite hotels-events-db
# create a key for this service
cf create-service-key hotels-events-db for-openwhisk
# retrieve the URL - it contains credentials + API URL
export CLOUDANT_URL=`cf service-key hotels-events-db for-openwhisk | grep \"url\" | awk -F '"' '{print $4}'`

# Deploy the OpenWhisk triggers/actions/rules
./deploy.sh --env
./deploy.sh --uninstall
./deploy.sh --install
