<?php
require_once 'config.php'; // Adjust path to your database config file

// Database connection
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_db_username';
$password = 'your_db_password';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        die("Invalid cancellation link.");
    }
    
    // Find the trial notification by token
    $stmt = $pdo->prepare("SELECT tn.*, u.email, u.name 
                          FROM trial_notifications tn
                          JOIN users u ON tn.user_id = u.id
                          WHERE tn.cancellation_token = :token
                          AND tn.subscription_cancelled = FALSE");
    $stmt->execute(['token' => $token]);
    $trial = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$trial) {
        die("Invalid or expired cancellation link.");
    }
    
    // Cancel the subscription
    $updateStmt = $pdo->prepare("UPDATE trial_notifications 
                                SET subscription_cancelled = TRUE 
                                WHERE id = :id");
    $updateStmt->execute(['id' => $trial['id']]);
    
    // Update user's subscription status in your users table
    $userStmt = $pdo->prepare("UPDATE users 
                              SET subscription_status = 'cancelled',
                                  subscription_end_date = CURRENT_DATE
                              WHERE id = :user_id");
    $userStmt->execute(['user_id' => $trial['user_id']]);
    
    // Cancel payment subscription with your payment provider
    // Add your payment provider's cancellation code here
    // Example: Stripe::cancelSubscription($user['stripe_subscription_id']);
    
} catch (PDOException $e) {
    die("An error occurred. Please contact support.");
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Subscription Cancelled - Wheels and Wins</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
        }
        .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <h1>Wheels and Wins</h1>
    <div class="success">
        <h2>Your subscription has been cancelled</h2>
        <p>You will not be charged, and your access will end today.</p>
    </div>
    <div class="info">
        <p>We're sorry to see you go!</p>
        <p>Your account will remain active until <?php echo date('F j, Y'); ?>.</p>
        <p>If you change your mind, you can always sign up again.</p>
    </div>
</body>
</html>