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

// Also update the test data initialization to ensure proper ID handling
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
    
    // Check if user is already in this room
    if target_room.current_students.iter().any(|student| student.name == current_user.email) {
        return HttpResponse::BadRequest().json(doc! {
            "error": "You are already assigned to this room"
        });
    }

    // Check room capacity
    if target_room.current_students.len() as i32 >= target_room.capacity {
        return HttpResponse::BadRequest().json(doc! {
            "error": "Room is full"
        });
    }

    // If user is assigned to another room, remove them from it
    if let Some(current_room_number) = &current_user.assigned_room {
        if let Ok(Some(mut current_room)) = rooms_collection
            .find_one(doc! { "number": current_room_number }, None)
            .await 
        {
            // Remove user from current room
            current_room.current_students.retain(|student| student.name != current_user.email);
            
            // Convert current_students to BSON and update
            let students_bson = to_bson(&current_room.current_students)
                .expect("Failed to serialize students");
            
            if let Err(e) = rooms_collection
                .update_one(
                    doc! { "number": current_room_number },
                    doc! { "$set": { "current_students": students_bson } },
                    None,
                )
                .await
            {
                println!("Error updating current room: {:?}", e);
                return HttpResponse::InternalServerError().json(doc! {
                    "error": "Failed to update current room"
                });
            }
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

    // Initialize test data
    initialize_test_data(&db).await;

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
                    .service(unassign_room),
            )
    })
    .bind("127.0.0.1:3000")?
    .run()
    .await
}