// Main API function - simple Supabase connection without express
export const handler = async (event: any, context: any) => {
  console.log('=== MAIN API FUNCTION CALLED ===');
  
  try {
    // Get the path from the event
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || 'GET';
    
    console.log(`📝 ${method} ${path}`);

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Missing Supabase configuration',
          error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
        })
      };
    }

    // Import Supabase dynamically
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('✅ Connected to Supabase');

    // Route handling
    if (path === '/api/properties' || path === '/properties') {
      // Fetch properties
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Database error',
            error: error.message
          })
        };
      }

      console.log(`✅ Found ${properties?.length || 0} properties`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: properties || []
        })
      };
    }

    // Default response for other routes
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'API is working',
        path: path,
        method: method,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('❌ Function error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message
      })
    };
  }
};
