import { writable } from 'svelte/store';
import Home from '../main/Home.svelte';
export const count = writable(0);
export const state = writable([{id: 0, component: Home}]);
