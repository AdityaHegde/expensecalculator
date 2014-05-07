import os
import urllib
import json
import response

from google.appengine.api import users
from google.appengine.ext import ndb

import logging
import webapp2

#TODO : Use user_id instead of email

def convert_query_to_dict(query):
    return [e.to_dict() for e in query]

def delete_from_query(query):
    for e in query:
        e.key.delete()

class Person(ndb.Model):
    id = ndb.StringProperty()
    name = ndb.StringProperty()
    owes = ndb.FloatProperty()
    owed = ndb.FloatProperty()

class PersonAttended(ndb.Model):
    name = ndb.StringProperty()
    toPay = ndb.FloatProperty()
    paid = ndb.GenericProperty()
    eventId = ndb.StringProperty()

class Event(ndb.Model):
    id = ndb.StringProperty()
    name = ndb.StringProperty()
    amt = ndb.GenericProperty()
    peopleAttended = ndb.StructuredProperty(PersonAttended, repeated=True)

def get_outing_details(outingName):
    outingKey = ndb.Key('Outing', outingName)
    return {
      "name" : outingName,
      "people" : convert_query_to_dict(Person.query(ancestor=outingKey).fetch()),
      "events" : convert_query_to_dict(Event.query(ancestor=outingKey).fetch())
    }

def save_new_delete_old_query(model, newData, query, key):
    dataMap = {}
    logging.warning(model)
    for dat in newData:
        obj = model.query(model.id == dat['id'], ancestor=key).get()
        if not obj:
            logging.warning("creating obj")
            logging.warning(dat)
            obj = model(parent=key)
        else:
            logging.warning("obj found")
            logging.warning(obj)
            dataMap[dat['id']] = 1
        obj.populate(**dat)
        obj.put()

    for e in query:
        if not dataMap[e.id]:
            e.key.delete()

def save_outing_details(outingData):
    outingKey = ndb.Key('Outing', outingData['outingName'])
    save_new_delete_old_query(Person, outingData['people'], Person.query(ancestor=outingKey).fetch(), outingKey)
    save_new_delete_old_query(Event, outingData['events'], Event.query(ancestor=outingKey).fetch(), outingKey)

def get_outings_by_person(person):
    people = Person.query(Person.name == person)
    outingNames = []
    for person in people:
        outingNames.insert(0, {
          "outingName" : person.parent_key().id(),
          "owes" : person["owes"],
          "owed" : person["owed"],
        })

    outingNames.sort()
    return outingNames

providers = {
  'Google'   : 'https://www.google.com/accounts/o8/id',
  'Yahoo'    : 'yahoo.com',
  'MySpace'  : 'myspace.com',
  'AOL'      : 'aol.com',
}

class MainPage(webapp2.RequestHandler):

    def get(self):
        user = users.get_current_user()
        if user:
            self.redirect("/public/index.html")
        else:
            self.response.out.write('Hello! Sign in at: ')
            for name, uri in providers.items():
                self.response.out.write('[<a href="%s">%s</a>]' % (users.create_login_url(federated_identity=uri), name))


class PageDataRequest(webapp2.RequestHandler):

    def get(self):
        self.response.headers['Content-Type'] = 'application/json' 
        user = users.get_current_user()
        if user:
            self.response.out.write(json.dumps(response.success("success", {
              "userName" : user.nickname(),
              "userMail" : user.email(),
              "outings" : get_outings_by_person(user.email()),
            })))
        else:
            self.response.out.write(json.dumps(response.failure("401", "Unauthorised user")))


class DataRequest(webapp2.RequestHandler):

    def get(self):
        self.response.headers['Content-Type'] = 'application/json' 
        user = users.get_current_user()
        if user:
            self.response.out.write(json.dumps(response.success("success", get_outing_details(self.request.get('outingName')))))
        else:
            self.response.out.write(json.dumps(response.failure("401", "Unauthorised user")))

    def post(self):
        self.response.headers['Content-Type'] = 'application/json' 
        user = users.get_current_user()
        if user:
            outingData = json.loads(self.request.POST['outingData'])
            logging.warning(outingData)
            save_outing_details(outingData)
            self.response.out.write(json.dumps(response.success("success", {})))
        else:
            self.response.out.write(json.dumps(response.failure("401", "Unauthorised user")))


app = webapp2.WSGIApplication([
    ('/data', DataRequest),
    ('/page_data', PageDataRequest),
    ('/', MainPage),
], debug=True)
