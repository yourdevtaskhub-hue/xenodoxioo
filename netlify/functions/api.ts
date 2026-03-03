// Main API function - simple Supabase connection without express
export const handler = async (event: any, context: any) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const environment = process.env.NODE_ENV || 'production';
  const supabaseUrl = process.env.SUPABASE_URL || 'UNKNOWN';
  
  console.log(`=== MAIN API FUNCTION CALLED ===`);
  console.log(`🆔 [${requestId}] Request ID: ${requestId}`);
  console.log(`🌍 [${requestId}] Environment: ${environment}`);
  console.log(`🗄️ [${requestId}] Supabase URL: ${supabaseUrl}`);
  console.log(`📝 [${requestId}] ${event.httpMethod || 'GET'} ${event.path || event.rawPath || ''}`);
  
  try {
    // Get the path from the event
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || 'GET';
    
    console.log(`📝 [${requestId}] ${method} ${path}`);

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`❌ [${requestId}] Missing Supabase configuration`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Missing Supabase configuration',
          error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
          requestId,
          environment
        })
      };
    }

    // Import Supabase dynamically
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`✅ [${requestId}] Connected to Supabase`);

    // Route handling
    if (path === '/api/properties' || path === '/properties') {
      // Fetch properties with units
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

      if (!properties || properties.length === 0) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: []
          })
        };
      }

      // Get units for each property
      const propertyIds = properties.map((p) => p.id);
      
      const { data: units } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .in('property_id', propertyIds);

      console.log(`✅ Found ${properties?.length || 0} properties and ${units?.length || 0} units`);

      // Transform properties to match frontend expectations
      const aggregatedProperties = properties.map((property) => {
        const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
        const minPrice = propertyUnits.length > 0 
          ? Math.min(...propertyUnits.map((u) => u.base_price))
          : 0;

        return {
          id: property.id,
          name: property.name,
          slug: property.slug,
          location: property.location,
          city: property.city,
          country: property.country,
          description: property.description,
          mainImage: property.main_image,
          galleryImages: property.gallery_images,
          isActive: property.is_active,
          createdAt: property.created_at,
          updatedAt: property.updated_at,
          units: propertyUnits.map((unit: any) => ({
            ...unit,
            images: unit.images ? (typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images) : [],
            propertyId: unit.property_id,
            maxGuests: unit.max_guests,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            basePrice: unit.base_price,
            cleaningFee: unit.cleaning_fee,
            minStayDays: unit.min_stay_days,
            isActive: unit.is_active
          })),
          unitsCount: propertyUnits.length,
          startingFrom: minPrice,
          _count: { units: propertyUnits.length },
          _min: { basePrice: minPrice }
        };
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: aggregatedProperties
        })
      };
    }

    // Handle admin routes
    if (path.startsWith('/api/admin/')) {
      return await handleAdminRoutes(path, method, supabase, event, requestId);
    }

    // Default response
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
    console.error(`❌ [${requestId}] Function error:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message,
        requestId,
        environment
      })
    };
  }
};

// Admin routes handler
async function handleAdminRoutes(path: string, method: string, supabase: any, event: any, requestId: string) {
  console.log(`🔧 [${requestId}] ${method} ${path}`);

  try {
    // POST /api/admin/properties
    if (path === '/api/admin/properties' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      console.log(`📝 [${requestId}] Property creation payload:`, JSON.stringify(body, null, 2));
      
      // Generate slug if missing
      if (!body.slug) {
        const baseSlug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substr(0, 50);
        
        body.slug = baseSlug || `property-${Date.now()}`;
        console.log(`✅ [${requestId}] Generated slug: ${body.slug}`);
      }
      
      // Add default main_image if not provided
      if (!body.main_image) {
        body.main_image = '';
      }
      
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          name: body.name,
          slug: body.slug,
          description: body.description || '',
          location: body.location || '',
          city: body.city,
          country: body.country,
          main_image: body.main_image,
          gallery_images: body.gallery_images || [],
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error(`❌ [${requestId}] Supabase error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: error.message,
            requestId,
            payload: body
          })
        };
      }

      console.log(`✅ [${requestId}] Property created successfully`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data, requestId })
      };
    }

    // Default admin route response
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Admin route not found',
        path: path
      })
    };

  } catch (error: any) {
    console.error('❌ Admin route error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Admin server error',
        error: error.message
      })
    };
  }
}
