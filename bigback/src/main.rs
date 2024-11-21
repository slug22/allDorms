use actix_cors::Cors;
use actix_web::{
    get, post, web, App, HttpResponse, HttpServer, Responder,
    middleware::Logger,
};
use futures::StreamExt;
use mongodb::{
    bson::{doc, oid::ObjectId, to_bson, Bson},
    Client, Database,
};
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,
    email: String,
    password: String,
    assigned_room: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Dorm {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,
    name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]  // Added Clone
struct Student {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Room {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,
    dorm_id: ObjectId,
    number: String,
    capacity: i32,
    current_students: Vec<Student>,
}

#[derive(Debug, Deserialize)]
struct LoginCredentials {
    email: String,
    password: String,
}
// Database connection helper
async fn get_db(mongo_uri: String) -> Result<Database, Box<dyn Error>> {
    let client = Client::with_uri_str(&mongo_uri).await?;
    Ok(client.database("dorm_management"))
}

// Route handlers
async fn login(
    credentials: web::Json<LoginCredentials>,
    db: web::Data<Database>,
) -> impl Responder {
    println!("Login attempt with email: {}", credentials.email);
    
    let collection = db.collection::<User>("users");
    
    let query = doc! {
        "email": &credentials.email,
        "password": &credentials.password
    };
    
    println!("Executing query: {:?}", query);
    
    match collection.find_one(query, None).await {
        Ok(Some(user)) => {
            println!("User found, login successful");
            HttpResponse::Ok().json(user)
        },
        Ok(None) => {
            println!("No user found with provided credentials");
            HttpResponse::Unauthorized().json(doc! {
                "error": "Invalid credentials"
            })
        },
        Err(e) => {
            println!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Internal server error"
            })
        }
    }
}

#[get("/dorms")]
async fn get_dorms(db: web::Data<Database>) -> impl Responder {
    println!("Fetching all dorms");
    let collection = db.collection::<Dorm>("dorms");
    
    match collection.find(None, None).await {
        Ok(cursor) => {
            let dorms: Vec<_> = cursor
                .collect::<Vec<Result<_, _>>>()
                .await
                .into_iter()
                .filter_map(Result::ok)
                .collect();
            println!("Found {} dorms", dorms.len());
            HttpResponse::Ok().json(dorms)
        }
        Err(e) => {
            println!("Error fetching dorms: {:?}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
#[get("/dorms/{dorm_id}/rooms")]
async fn get_rooms(db: web::Data<Database>, dorm_id: web::Path<String>) -> impl Responder {
    println!("Received request for dorm_id: {}", dorm_id);
    
    let collection = db.collection::<Room>("rooms");
    
    let oid = match ObjectId::parse_str(dorm_id.as_str()) {
        Ok(oid) => oid,
        Err(e) => {
            println!("Invalid dorm_id format: {}. Error: {:?}", dorm_id, e);
            return HttpResponse::BadRequest().json(doc! {
                "error": "Invalid dorm ID format"
            });
        }
    };
    
    println!("Looking for rooms with dorm_id: {}", oid);
    
    match collection.find(doc! { "dorm_id": oid }, None).await {
        Ok(cursor) => {
            let rooms: Vec<_> = cursor
                .collect::<Vec<Result<_, _>>>()
                .await
                .into_iter()
                .filter_map(Result::ok)
                .collect();
            println!("Found {} rooms", rooms.len());
            HttpResponse::Ok().json(rooms)
        }
        Err(e) => {
            println!("Error fetching rooms: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to fetch rooms"
            })
        }
    }
}

Also update the test data initialization to ensure proper ID handling
async fn initialize_test_data(db: &Database) {
    println!("Initializing test data...");

    // Create test dorm
    let dorms_collection = db.collection("dorms");
    let test_dorm = doc! {
        "name": "Test Dorm"
    };
    
    let dorm_result = match dorms_collection
        .insert_one(test_dorm, None)
        .await {
            Ok(result) => {
                println!("Created test dorm");
                result
            },
            Err(e) => {
                println!("Error creating test dorm: {:?}", e);
                return;
            }
        };

    let dorm_id = match dorm_result.inserted_id.as_object_id() {
        Some(id) => {
            println!("Test dorm ID: {}", id);
            id
        },
        None => {
            println!("Failed to get dorm ID");
            return;
        }
    };

    // Create test rooms
    let rooms_collection = db.collection("rooms");
    for i in 1..=5 {
        let test_room = doc! {
            "dorm_id": dorm_id,
            "number": format!("10{}", i),
            "capacity": 4,
            "current_students": []
        };
        
        match rooms_collection.insert_one(test_room, None).await {
            Ok(_) => println!("Created room {}", i),
            Err(e) => println!("Error creating room {}: {:?}", i, e),
        }
    }
}
#[get("/user")]
async fn get_user(db: web::Data<Database>) -> impl Responder {
    println!("Fetching user info");
    let collection = db.collection::<User>("users");
    
    match collection.find_one(None, None).await {
        Ok(Some(user)) => {
            println!("User found");
            HttpResponse::Ok().json(user)
        }
        Ok(None) => {
            println!("No user found");
            HttpResponse::NotFound().finish()
        }
        Err(e) => {
            println!("Error fetching user: {:?}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
#[post("/rooms/{room_id}/assign")]
async fn assign_room(
    db: web::Data<Database>,
    room_id: web::Path<String>,
) -> impl Responder {
    println!("Assigning room with ID: {}", room_id);
    
    let rooms_collection = db.collection::<Room>("rooms");
    let users_collection = db.collection::<User>("users");
    
    let oid = match ObjectId::parse_str(room_id.as_str()) {
        Ok(oid) => oid,
        Err(e) => {
            println!("Failed to parse room ID '{}': {:?}", room_id, e);
            return HttpResponse::BadRequest().json(doc! {
                "error": "Invalid room ID format"
            });
        }
    };
    
    // Get current user
    let current_user = match users_collection.find_one(doc! {}, None).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return HttpResponse::NotFound().json(doc! {
                "error": "User not found"
            });
        }
        Err(e) => {
            println!("Error finding user: {:?}", e);
            return HttpResponse::InternalServerError().json(doc! {
                "error": "Internal server error"
            });
        }
    };

    // Get target room
    let mut target_room = match rooms_collection.find_one(doc! { "_id": oid }, None).await {
        Ok(Some(room)) => room,
        Ok(None) => {
            return HttpResponse::NotFound().json(doc! {
                "error": "Room not found"
            });
        }
        Err(e) => {
            println!("Database error when finding room: {:?}", e);
            return HttpResponse::InternalServerError().json(doc! {
                "error": "Internal server error"
            });
        }
    };
    
    // Check room capacity
    if target_room.current_students.len() as i32 >= target_room.capacity {
        return HttpResponse::BadRequest().json(doc! {
            "error": "Room is full"
        });
    }

    // Remove user from ALL rooms (not just their currently assigned room)
    match rooms_collection
        .update_many(
            doc! {},  // Empty filter to match all rooms
            doc! { 
                "$pull": { 
                    "current_students": { 
                        "name": &current_user.email 
                    } 
                } 
            },
            None,
        )
        .await
    {
        Ok(_) => println!("Removed user from all rooms successfully"),
        Err(e) => {
            println!("Error removing user from rooms: {:?}", e);
            return HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to update rooms"
            });
        }
    }

    // Add user to new room
    target_room.current_students.push(Student {
        id: None,
        name: current_user.email.clone(),
    });

    // Convert target room students to BSON and update
    let students_bson = to_bson(&target_room.current_students)
        .expect("Failed to serialize students");

    match rooms_collection
        .update_one(
            doc! { "_id": oid },
            doc! { "$set": { "current_students": students_bson } },
            None,
        )
        .await
    {
        Ok(_) => println!("Updated target room successfully"),
        Err(e) => {
            println!("Error updating target room: {:?}", e);
            return HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to update target room"
            });
        }
    }

    // Update user's assigned room
    match users_collection
        .update_one(
            doc! { "email": &current_user.email },
            doc! { "$set": { "assigned_room": &target_room.number } },
            None,
        )
        .await
    {
        Ok(_) => {
            println!("Successfully assigned room");
            HttpResponse::Ok().json(doc! {
                "message": "Room assigned successfully"
            })
        },
        Err(e) => {
            println!("Error assigning room: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to assign room"
            })
        }
    }
}
// Add these new structs at the top with your other structs
#[derive(Debug, Serialize, Deserialize, Clone)]
struct School {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,
    name: String,
   
}

#[derive(Debug, Deserialize)]
struct AdminLoginCredentials {
    email: String,
    password: String,
    school_id: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct AdminCredential {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,
    email: String,
    password: String,
    school_id: ObjectId,  // Store as ObjectId instead of String
}

#[derive(Debug, Deserialize)]
struct CreateDormRequest {
    name: String,
    school_id: String,
}

#[derive(Debug, Deserialize)]
struct CreateRoomRequest {
    dorm_id: String,
    number: String,
    capacity: i32,
}

#[derive(Debug, Deserialize)]
struct CreateStudentRequest {
    email: String,
    password: String,
    school_id: String,
}
// Replace the existing initialize_test_admin function with this one
async fn initialize_test_admin(db: &Database) -> Result<ObjectId, Box<dyn Error>> {
    let admin_collection = db.collection::<AdminCredential>("admin_credentials");
    
    // Check if test admin exists
    if let Ok(Some(admin)) = admin_collection
        .find_one(doc! { "email": "1" }, None)
        .await 
    {
        println!("Test admin already exists");
        return Ok(admin.id.unwrap());
    }

    // Get the test school ID first
    let school_id = match db.collection::<School>("schools")
        .find_one(doc! { "name": "Test School1" }, None)
        .await?
    {
        Some(school) => school.id.unwrap(),
        None => {
            println!("Test school not found, creating it first...");
            initialize_test_school(db).await?
        }
    };

    // Create test admin credentials
    let test_admin = AdminCredential {
        id: None,
        email: "1".to_string(),
        password: "1".to_string(),
        school_id,
    };
 
    match admin_collection.insert_one(test_admin, None).await {
        Ok(result) => {
            println!("Test admin created successfully");
            Ok(result.inserted_id.as_object_id().unwrap())
        },
        Err(e) => {
            println!("Failed to create test admin: {:?}", e);
            Err("Failed to create test admin".into())
        },
    }
}

// Update the admin_login handler to use the new AdminCredential struct
#[post("/admin/login")]
async fn admin_login(
    credentials: web::Json<AdminLoginCredentials>,
    db: web::Data<Database>,
) -> impl Responder {
    let admin_collection = db.collection::<AdminCredential>("admin_credentials");
    let schools_collection = db.collection::<School>("schools");
    
    let school_oid = match ObjectId::parse_str(&credentials.school_id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(doc! {
            "error": "Invalid school ID"
        }),
    };

    // First check if the admin credentials exist
    match admin_collection
        .find_one(doc! { 
            "email": &credentials.email,
            "password": &credentials.password,  // In production, use proper password verification
            "school_id": school_oid
        }, None)
        .await
    {
        Ok(Some(_)) => {
            // If admin exists, get school info
            match schools_collection.find_one(doc! { "_id": school_oid }, None).await {
                Ok(Some(school)) => {
                    HttpResponse::Ok().json(doc! {
                        "message": "Login successful",
                        "school": {
                            "id": school.id,
                            "name": school.name
                        }
                    })
                },
                Ok(None) => HttpResponse::NotFound().json(doc! {
                    "error": "School not found"
                }),
                Err(_) => HttpResponse::InternalServerError().finish(),
            }
        },
        Ok(None) => HttpResponse::Unauthorized().json(doc! {
            "error": "Invalid credentials"
        }),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}
#[post("/rooms/unassign")]
async fn unassign_room(db: web::Data<Database>) -> impl Responder {
    println!("Unassigning room");
    let rooms_collection = db.collection::<Room>("rooms");
    let users_collection = db.collection::<User>("users");
    
    // Get current user
    let current_user = match users_collection.find_one(doc! {}, None).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return HttpResponse::NotFound().json(doc! {
                "error": "User not found"
            });
        }
        Err(e) => {
            println!("Error finding user: {:?}", e);
            return HttpResponse::InternalServerError().json(doc! {
                "error": "Internal server error"
            });
        }
    };

    // If user is assigned to a room, remove them from it
    if let Some(room_number) = &current_user.assigned_room {
        if let Ok(Some(mut room)) = rooms_collection
            .find_one(doc! { "number": room_number }, None)
            .await 
        {
            // Remove user from room
            room.current_students.retain(|student| student.name != current_user.email);
            
            // Convert current_students to BSON and update
            let students_bson = to_bson(&room.current_students)
                .expect("Failed to serialize students");
            
            if let Err(e) = rooms_collection
                .update_one(
                    doc! { "number": room_number },
                    doc! { "$set": { "current_students": students_bson } },
                    None,
                )
                .await
            {
                println!("Error updating room: {:?}", e);
                return HttpResponse::InternalServerError().json(doc! {
                    "error": "Failed to update room"
                });
            }
        }
    }

    // Update user's assigned room to null
    match users_collection
        .update_one(
            doc! { "email": &current_user.email },
            doc! { "$set": { "assigned_room": null } },
            None,
        )
        .await
    {
        Ok(_) => {
            println!("Successfully unassigned room");
            HttpResponse::Ok().json(doc! {
                "message": "Room unassigned successfully"
            })
        },
        Err(e) => {
            println!("Error unassigning room: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to unassign room"
            })
        }
    }
}
#[post("/admin/dorms")]
async fn create_dorm(
    req: web::Json<CreateDormRequest>,
    db: web::Data<Database>,
) -> impl Responder {
    let dorms_collection = db.collection::<Dorm>("dorms");
    
    let school_id = match ObjectId::parse_str(&req.school_id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(doc! {
            "error": "Invalid school ID"
        }),
    };

    let new_dorm = Dorm {
        id: None,
        name: req.name.clone(),
    };

    match dorms_collection.insert_one(new_dorm, None).await {
        Ok(result) => HttpResponse::Ok().json(doc! {
            "id": result.inserted_id,
            "message": "Dorm created successfully"
        }),
        Err(e) => {
            println!("Failed to create dorm: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to create dorm"
            })
        },
    }
}
#[post("/admin/rooms")]
async fn create_room(
    req: web::Json<CreateRoomRequest>,
    db: web::Data<Database>,
) -> impl Responder {
    let rooms_collection = db.collection::<Room>("rooms");
    
    // Parse the dorm_id string into ObjectId
    let dorm_id = match ObjectId::parse_str(&req.dorm_id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(doc! {
            "error": "Invalid dorm ID format"
        }),
    };

    // Verify that the dorm exists
    let dorms_collection = db.collection::<Dorm>("dorms");
    if let Ok(None) = dorms_collection.find_one(doc! { "_id": &dorm_id }, None).await {
        return HttpResponse::NotFound().json(doc! {
            "error": "Dorm not found"
        });
    }

    // Create the new room with proper initialization
    let new_room = Room {
        id: None,  // MongoDB will generate this
        dorm_id,
        number: req.number.clone(),
        capacity: req.capacity,
        current_students: Vec::new(),
    };

    match rooms_collection.insert_one(new_room, None).await {
        Ok(result) => {
            let room_id = result.inserted_id.as_object_id()
                .expect("MongoDB should have generated an ObjectId");
                
            HttpResponse::Ok().json(doc! {
                "id": room_id,
                "message": "Room created successfully"
            })
        },
        Err(e) => {
            println!("Failed to create room: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to create room"
            })
        },
    }
}

#[post("/admin/students")]
async fn create_student(
    req: web::Json<CreateStudentRequest>,
    db: web::Data<Database>,
) -> impl Responder {
    let users_collection = db.collection::<User>("users");
    
    let school_id = match ObjectId::parse_str(&req.school_id) {
        Ok(oid) => oid,
        Err(_) => return HttpResponse::BadRequest().json(doc! {
            "error": "Invalid school ID"
        }),
    };

    // Check if user already exists
    if let Ok(Some(_)) = users_collection
        .find_one(doc! { "email": &req.email }, None)
        .await 
    {
        return HttpResponse::BadRequest().json(doc! {
            "error": "Student with this email already exists"
        });
    }

    let new_user = User {
        id: None,
        email: req.email.clone(),
        password: req.password.clone(), // In production, hash this password
        assigned_room: None,
    };

    match users_collection.insert_one(new_user, None).await {
        Ok(result) => HttpResponse::Ok().json(doc! {
            "id": result.inserted_id,
            "message": "Student created successfully"
        }),
        Err(e) => {
            println!("Failed to create student: {:?}", e);
            HttpResponse::InternalServerError().json(doc! {
                "error": "Failed to create student"
            })
        },
    }
}

// Add this helper function to initialize a test school if it doesn't exist
async fn initialize_test_school(db: &Database) -> Result<ObjectId, Box<dyn Error>> {
    let schools_collection = db.collection::<School>("schools");
    
    // Check if test school exists
    if let Ok(Some(school)) = schools_collection
        .find_one(doc! { "name": "Test School" }, None)
        .await 
    {
        println!("Test school already exists");
        return Ok(school.id.unwrap());
    }

    // Create test school
    let test_school = School {
        id: None,
        name: "Test School".to_string(),
        
    };
 
    match schools_collection.insert_one(test_school, None).await {
        Ok(result) => {
            println!("Test school created successfully");
            Ok(result.inserted_id.as_object_id().unwrap())
        },
        Err(e) => {
            println!("Failed to create test school: {:?}", e);
            Err("Failed to create test school".into())
        },
    }
}

// Update your main function to initialize the test school
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=debug");
    env_logger::init();

    let mongo_uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());

    println!("Connecting to MongoDB...");
    
    let db = web::Data::new(
        get_db(mongo_uri)
            .await
            .expect("Failed to connect to MongoDB"),
    );

    // Initialize test data and school
    initialize_test_data(&db).await;
    match initialize_test_school(&db).await {
        Ok(school_id) => println!("Test school ID: {}", school_id),
        Err(e) => println!("Error initializing test school: {:?}", e),
    }
    match initialize_test_admin(&db).await {
        Ok(admin_id) => println!("Test admin ID: {}", admin_id),
        Err(e) => println!("Error initializing test school: {:?}", e),
    }
    println!("Starting HTTP server...");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials();

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(db.clone())
            .service(
                web::scope("/api")
                    .route("/login", web::post().to(login))
                    .service(get_dorms)
                    .service(get_rooms)
                    .service(get_user)
                    .service(assign_room)
                    .service(unassign_room)
                    .service(admin_login)
                    .service(create_dorm)
                    .service(create_room)
                    .service(create_student),
            )
    })
    .bind("127.0.0.1:3000")?
    .run()
    .await
}