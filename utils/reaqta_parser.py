import json
from geoip import geolite2
import sys
import yaml

# Search on Threat Hunting with ETW WININET and NETWORK CONNECTION ESTABLISHED

file = open("payload.json")
des_json = json.loads(file.read())

connections = []

for element in des_json:
    obj_connection = {"origin_name":"Bari", "origin_longitude":16.871778, "origin_latitude":41.121702, "remote_ip":None, "remote_port":None, "type":None, "remote_request": None, "timezone":None, "destination_longitude": None, "destination_latitude": None, "options": "arcSetup.inbound.level_6"}
    
    if element["payload"]["data"].get("url") is not None:
        obj_connection["type"]="WinINet"
        obj_connection["remote_ip"] = str(element["payload"]["data"]['url'].split('/')[2].split(':')[0]).encode("ascii")
        obj_connection["remote_request"] = str(element["payload"]["data"]["url"]).encode("ascii")
    else:
        obj_connection["type"]="Socket"
        obj_connection["remote_ip"] = str(element["payload"]["data"]["remoteAddr"]).encode("ascii")
        obj_connection["remote_port"] = element["payload"]["data"]["remotePort"]

    geoip = geolite2.lookup(obj_connection["remote_ip"].split(':')[0])
        
    if hasattr(geoip, 'timezone') is True:
        obj_connection["destination_name"] = geoip.timezone
    else:
        obj_connection["destination_name"] = "n.a."

    if hasattr(geoip, 'location') is True:
        
        obj_connection["destination_longitude"] = geoip.location[1]
        obj_connection["destination_latitude"] = geoip.location[0]
    else:
        obj_connection["destination_longitude"] = None
        obj_connection["destination_latitude"] = None

    connections.append(obj_connection)
    
valore = yaml.dump(connections)
out_file = open("output.yaml","w")
out_file.write(valore)
out_file.close()