import json
import pandas as pd

def dataframe_to_geojson_exclude_null_coords(df, lat='Latitude', lon='Longitude'):
    features = []
    for _, row in df.iterrows():
        try:
            latitude = row[lat]
            longitude = row[lon]
            if pd.notnull(latitude) and pd.notnull(longitude):  # Only include rows with valid coords
                latitude = float(latitude)
                longitude = float(longitude)
                properties = row.dropna().to_dict()  # Include all non-null properties
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [longitude, latitude]
                    },
                    "properties": properties
                }
                features.append(feature)
        except (ValueError, KeyError, TypeError):
            continue  # Skip rows with missing or invalid data
    return {
        "type": "FeatureCollection",
        "features": features
    }

with open('tsunamis.tsv', 'r') as f:
    tsunamis_data = pd.read_csv(f, sep='\t')
with open('earthquakes.tsv', 'r') as f:
    earthquakes_data = pd.read_csv(f, sep='\t')


tsunamis_geojson_no_null_coords = dataframe_to_geojson_exclude_null_coords(tsunamis_data)
earthquakes_geojson_no_null_coords = dataframe_to_geojson_exclude_null_coords(earthquakes_data)

# Save updated GeoJSON files
tsunamis_geojson_no_null_coords_path = 'tsunamis.geojson'
earthquakes_geojson_no_null_coords_path = 'earthquakes.geojson'

with open(tsunamis_geojson_no_null_coords_path, 'w') as f:
    json.dump(tsunamis_geojson_no_null_coords, f)

with open(earthquakes_geojson_no_null_coords_path, 'w') as f:
    json.dump(earthquakes_geojson_no_null_coords, f)


