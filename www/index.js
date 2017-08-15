var module = angular.module("simplePlayer", []);

module.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

module.controller("index", function ($scope, $http, socket) {

    // Function definitions

    $scope.addSong = function () {
        $http.post("/addSong", { url: $scope.songUrl }).then(function (response) {
            if (response.data.result) {
                $scope.songUrl = "";
            } else
                console.warn(response.data.message);
        });
    };

    $scope.startPlayer = function () {
        $http.post("/start", {}, function (response) {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.stopPlayer = function (response) {
        $http.post("/stop", {}, function () {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    $scope.pausePlayer = function (response) {
        $http.post("/pause", {}, function () {
            if (!response.data.result)
                console.warn(response.data.message);
        });
    };

    // Event listeners

    socket.on("queueChanged", queue => $scope.playlist = queue);
    socket.on("songChanged", song => $scope.currentSong = song);

    // Get Data

    $http.get("/queue").then(function (response) {
        $scope.playlist = response.data;
    });

    $http.get("/currentSong").then(function (response) {
        $scope.currentSong = response.data;
    });
});