#!/bin/bash
    pip install numpy pandas joblib scipy scikit-learn nltk
    cd node_modules/whatsapp-web.js/src/util
    sed -i "s/window.Store.MediaPrep = window.mR.findModule('MediaPrep')[0];/window.Store.MediaPrep = window.mR.findModule('prepRawMedia')[0];/g" Injected.js
