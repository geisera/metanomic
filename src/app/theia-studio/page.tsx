'use client';
import {useEffect} from 'react';
export default function Legacy(){useEffect(()=>{window.location.replace('/assistant-studio'+window.location.search+window.location.hash);},[]);return <p>Opening Assistant Studio… <a href='/assistant-studio'>Continue</a></p>;}
