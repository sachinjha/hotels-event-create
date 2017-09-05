#!/bin/bash
#
# Copyright 2016 IBM Corp. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the “License”);
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#  https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an “AS IS” BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# load configuration variables
source local.env

# PACKAGE_NAME is configurable so that multiple versions of the actions
# can be deployed in different packages under the same namespace
if [ -z $PACKAGE_NAME ]; then
  PACKAGE_NAME=hotels-event
fi

function usage() {
  echo "Usage: $0 [--install,--uninstall,--update,--env]"
}

function install() {

  echo "Creating database..."
  # ignore "database already exists error"
  curl -s -X PUT $CLOUDANT_URL/$CLOUDANT_DATABASE | grep -v file_exists

  echo "Inserting database design documents..."
  # ignore "document already exists error"
  curl -s -X POST -H 'Content-Type: application/json' -d @database-designs.json $CLOUDANT_URL/$CLOUDANT_DATABASE/_bulk_docs | grep -v conflict

  echo "Creating $PACKAGE_NAME package"
  wsk package create $PACKAGE_NAME\
    -p services.redis.url $REDIS_URL\
    -p services.cloudant.url $CLOUDANT_URL\
    -p services.cloudant.database $CLOUDANT_DATABASE\
    -p services.api.key $API_KEY\
    -p services.api.secret $API_SECRET\
    -p services.api.URL $API_HOST

  echo "Creating actions"
  wsk action create $PACKAGE_NAME/eventhandler\
    -a description 'Handle events related to property and location'\
    --kind nodejs:default\
    dist/eventhandler.zip
  
  wsk action create $PACKAGE_NAME/bootstrap\
    -a description 'Initialize the db with some property and locations '\
    --kind nodejs:default\
    dist/bootstrap.zip
  
  #create trigger
  echo "creating trigger"
  wsk trigger create cloudantChangesTrigger --feed /_/Bluemix_hotels-events-db_for-openwhisk/changes \
    --param dbname eventsdb\
    --param filter "eventsFilter/eventsDoc" 

  echo "creating rule"
  wsk rule create eventhandler-cloudantChangesTrigger  cloudantChangesTrigger $PACKAGE_NAME/eventhandler
}

function uninstall() {
  echo "Removing actions..."
  wsk action delete $PACKAGE_NAME/eventhandler
  wsk action delete $PACKAGE_NAME/bootstrap
  wsk trigger delete /_/cloudantChangesTrigger
  wsk rule delete eventhandler-cloudantChangesTrigger
  
  echo "Removing package..."
  wsk package delete $PACKAGE_NAME

  echo "Done"
  wsk list
}

function update() {
  echo "Updating actions..."
  wsk action update $PACKAGE_NAME/eventhandler         dist/eventhandler.zip
  wsk action update $PACKAGE_NAME/bootstrap            dist/bootstrap.zip
  }

function showenv() {
  echo "PACKAGE_NAME=$PACKAGE_NAME"
  echo "REDIS_URL=$REDIS_URL"
  echo "CLOUDANT_URL=$CLOUDANT_URL"
  echo "CLOUDANT_DATABASE=$CLOUDANT_DATABASE"
  echo "API_KEY=$API_KEY"
  echo "API_SECRET=$API_SECRET"
  echo "API_HOST=$API_HOST"
}

case "$1" in
"--install" )
install
;;
"--uninstall" )
uninstall
;;
"--update" )
update
;;
"--env" )
showenv
;;
* )
usage
;;
esac