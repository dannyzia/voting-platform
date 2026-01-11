#!/usr/bin/env python3
"""
Generate Constituency GeoJSON from Upazila boundaries.

This script reads the constituency-to-upazila mapping and merges upazila polygons
from bgd_admin3.geojson to create constituency boundaries.

Based on: জাতীয় সংসদের নির্বাচনি এলাকার প্রাথমিক সীমানা পুনঃনির্ধারণ-২০২৫
(Bangladesh Election Commission - Constituency Delimitation 2025)
"""

import json
import os
from typing import Dict, List, Tuple, Any
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

# Project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOJSON_PATH = os.path.join(PROJECT_ROOT, "bgd_admin_boundaries.geojson", "bgd_admin3.geojson")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "constituencies.geojson")
MAPPING_PATH = os.path.join(PROJECT_ROOT, "data", "constituency_mapping.json")


def load_upazila_geojson() -> Dict[str, Any]:
    """Load the upazila GeoJSON file."""
    with open(GEOJSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_constituency_mapping() -> Dict[str, Any]:
    """Load the constituency mapping file."""
    with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_upazila_index(geojson: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build an index of upazilas by name for quick lookup.
    Returns a dict with keys as lowercase upazila names and values as feature objects.
    """
    index = {}
    
    # Name variations/aliases
    ALIASES = {
        "tetulia": "tentulia",
        "atwari": "atowari", 
        "ranisankail": "ranisankail",
        "pirgacha": "pirgachha",
        "rowmari": "rowmari",
        "dhupchanchia": "dhupchanchia",
        "shahjahanpur": "shajahanpur",
        "kahalu": "kahaloo",
        "dupchanchia": "dhupchanchia", 
        "mohadevpur": "mahadebpur",
        "chowhali": "chauhali",
        "raiganj": "rayganj",
        "kaliaganj": "kaliakair",
        "shahzadpur": "shahjadpur",
        "gaffargaon": "gauripur",
        "gauripur": "gouripur",
        "srinagar": "shreenagar",
        "serajdikhan": "sirajdikhan",
        "dhaka city corporation": "dhaka",
        "chattogram city corporation": "chattogram",
        "narayanganj city corporation": "narayanganj",
        "gazipur city corporation": "gazipur",
        "sylhet city corporation": "sylhet",
        "mymensingh city corporation": "mymensingh",
        "rajshahi city corporation": "rajshahi",
        "barishal city corporation": "barishal",
        "cumilla city corporation": "cumilla",
        "khulna city corporation": "khulna",
        "rangpur city corporation": "rangpur",
        "monohardi": "monohordi",
        "matlab dakshin": "matlab south",
        "sadar dakshin": "adarsha sadar",
        "saatkaniya": "satkania",
        "eidgaon": "eidgah"
    }
    
    for feature in geojson['features']:
        props = feature['properties']
        upazila_name = props['adm3_name'].lower().strip()
        district_name = props['adm2_name'].lower().strip()
        
        # Index by "upazila, district" for unique identification
        key = f"{upazila_name}|{district_name}"
        index[key] = feature
        
        # Also index by just upazila name (for simple lookups)
        if upazila_name not in index:
            index[upazila_name] = feature
        
        # Add without "sadar" suffix
        if "sadar" in upazila_name:
            base_name = upazila_name.replace(" sadar", "").replace(" (kotwali)", "")
            if base_name not in index:
                index[base_name] = feature
        
        # Add city corporation mappings
        if "city corporation" in upazila_name:
            base_name = upazila_name.replace(" city corporation", "")
            if base_name not in index:
                index[base_name] = feature
    
    # Add reverse aliases
    for alias, original in ALIASES.items():
        if original in index and alias not in index:
            index[alias] = index[original]
            
    return index


def merge_polygons(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge multiple feature geometries into a single polygon/multipolygon.
    """
    if not features:
        return None
        
    geometries = [shape(f['geometry']) for f in features]
    merged = unary_union(geometries)
    return mapping(merged)


def find_upazila(upazila_name: str, district: str, upazila_index: Dict[str, Any]) -> Any:
    """
    Find an upazila feature by name and district.
    """
    name = upazila_name.lower().strip()
    dist = district.lower().strip()
    
    # Name normalizations
    NORMALIZE = {
        "tetulia": "tentulia",
        "atwari": "atowari",
        "pirgacha": "pirgachha",
        "kahalu": "kahaloo",
        "dupchanchia": "dhupchanchia",
        "mohadevpur": "mahadebpur",
        "chowhali": "chauhali",
        "shahzadpur": "shahjadpur",
        "raiganj": "rayganj",
        "srinagar": "shreenagar",
        "serajdikhan": "sirajdikhan",
        "monohardi": "monohordi",
        "matlab dakshin": "matlab south",
        "sadar dakshin": "adarsha sadar",
        "saatkaniya": "satkania",
        "eidgaon": "eidgah",
        "gaffargaon": "gafargaon",
        "gauripur": "gouripur",
        "rowmari": "rahumari"
    }
    
    # Normalize the name
    if name in NORMALIZE:
        name = NORMALIZE[name]
    
    # Try exact match with district first
    key = f"{name}|{dist}"
    if key in upazila_index:
        return upazila_index[key]
    
    # Try just upazila name
    if name in upazila_index:
        return upazila_index[name]
    
    # Handle City Corporation special cases
    if "city corporation" in name:
        base = name.replace(" city corporation", "")
        # Try city corporation variant
        cc_key = f"{base} city corporation"
        if cc_key in upazila_index:
            return upazila_index[cc_key]
        # Try just base name
        if base in upazila_index:
            return upazila_index[base]
    
    # Try with "sadar" suffix
    if "sadar" not in name:
        sadar_key = f"{name} sadar"
        if sadar_key in upazila_index:
            return upazila_index[sadar_key]
        sadar_key = f"{name} sadar|{dist}"
        if sadar_key in upazila_index:
            return upazila_index[sadar_key]
    
    # Try removing "sadar" if present
    if "sadar" in name:
        base_key = name.replace(" sadar", "")
        if base_key in upazila_index:
            return upazila_index[base_key]
    
    return None


def generate_constituency_geojson():
    """
    Main function to generate constituency GeoJSON.
    """
    print("Loading upazila GeoJSON...")
    upazila_geojson = load_upazila_geojson()
    upazila_index = build_upazila_index(upazila_geojson)
    
    print(f"Loaded {len(upazila_geojson['features'])} upazilas")
    print(f"Index contains {len(upazila_index)} entries")
    
    print("Loading constituency mapping...")
    mapping_data = load_constituency_mapping()
    
    print(f"Processing {len(mapping_data['constituencies'])} constituencies...")
    
    features = []
    errors = []
    
    for constituency in mapping_data['constituencies']:
        code = constituency['code']
        name = constituency['name']
        district = constituency['district']
        division = constituency['division']
        upazilas = constituency['upazilas']
        
        # Find upazila features
        upazila_features = []
        missing = []
        
        for upazila in upazilas:
            feature = find_upazila(upazila, district, upazila_index)
            if feature:
                upazila_features.append(feature)
            else:
                missing.append(upazila)
        
        if missing:
            errors.append({
                'constituency': code,
                'name': name,
                'missing_upazilas': missing
            })
        
        if upazila_features:
            # Merge polygons
            merged_geometry = merge_polygons(upazila_features)
            
            # Create feature
            feature = {
                "type": "Feature",
                "properties": {
                    "constituency_code": code,
                    "constituency_name": name,
                    "district": district,
                    "division": division,
                    "upazila_count": len(upazila_features)
                },
                "geometry": merged_geometry
            }
            features.append(feature)
        else:
            print(f"Warning: No upazilas found for {code} - {name}")
    
    # Create FeatureCollection
    geojson = {
        "type": "FeatureCollection",
        "name": "bangladesh_constituencies_2025",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": features
    }
    
    # Save output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False)
    
    print(f"\nGenerated {len(features)} constituency boundaries")
    print(f"Output saved to: {OUTPUT_PATH}")
    
    if errors:
        print(f"\nWarnings ({len(errors)} constituencies with missing upazilas):")
        for error in errors[:10]:
            print(f"  {error['constituency']} - {error['name']}: {error['missing_upazilas']}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
    
    return geojson


if __name__ == "__main__":
    generate_constituency_geojson()
