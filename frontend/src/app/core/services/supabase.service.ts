import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
    private client: SupabaseClient;

    constructor() {
        this.client = createClient(
            environment.supabaseUrl,
            environment.supabaseAnonKey
        );
    }

    get supabase(): SupabaseClient {
        return this.client;
    }
}