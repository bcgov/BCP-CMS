#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import requests


# variables
par_api_url_base = 'https://a100.gov.bc.ca/pub/parws'
#base_url = Variable.get("base_url_data", deserialize_json=True)
#par_api_url_base = base_url["par"]
#bcgw_api_url_base = base_url["bcgw"]

headers = {
    'Content-Type': 'application/json'
}


def _get_data_from_par(task_instance):
    api_url = f"{par_api_url_base}/protectedLands?protectedLandName=%25&protectedLandTypeCodes=CS,ER,PA,PK,RA"
    
    try:
        response = requests.get(api_url, headers=headers)
        
        if response.status_code == 200:
            # convert json to Python object 
            data = response.json()

            if 'data' in data:
                for d in data["data"]:
                    print(d)

                return data["data"]
            else:
                #TODO: write to aitflow
                print('data does not conform to expectations!')
    except:
        # TODO: write error into airflow
        print('Error invoking webservice')
        raise



def _get_data_from_bcgw(task_instance):
    pass


def _transform_data(task_instance):
    data = task_instance.xcom_pull(task_ids='_get_data_from_par')

    json = []

    for pro_land in data:
        json.append({
            "id": pro_land["orcNumber"]
        })

    return json


def _dump_data(task_instance):
    data = task_instance.xcom_pull(task_ids='_transform_data')
    
    return None

if __name__ == "__main__":
    _get_data_from_par(None)
