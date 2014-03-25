def success ( message, data ):
    return { "status" : "0", "code" : "200", "message" : message, "data" : data }

def failure ( code, message ):
    return { "status" : "1", "code" : code, "message" : message }
